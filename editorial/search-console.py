#!/usr/bin/env python3
"""Lê o Search Console e acrescenta à pauta as buscas que já mostram o site e ninguém clica.

Credencial, uma das duas (secrets da Action):
  · GSC_OAUTH_JSON — {client_id, client_secret, refresh_token} de uma pessoa com acesso à
    propriedade (o login Google do Lumied/Ads, que desde o PR #1902 pede webmasters.readonly);
  · GSC_SERVICE_ACCOUNT_JSON — chave de conta de serviço adicionada como usuário na propriedade.
Sem nenhuma das duas, o script sai sem fazer nada — a Action roda antes de o acesso existir.

Regra da pauta: consulta com >= 20 impressões nos últimos 90 dias, posição média entre
4 e 30 (o Google já acha o site relevante, mas não o bastante), CTR abaixo de 2%, e que
não seja marca ("maple bear"). Entram até 3 temas novos por rodada, no fim da fila.
"""
import json, os, re, sys, datetime, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ED = os.path.join(REPO, "editorial")
CFG = json.load(open(os.path.join(ED, "config.json"), encoding="utf-8"))
PROPRIEDADE = CFG.get("search_console_property") or f"sc-domain:{CFG['base_url'].split('//')[1]}"


def token_da_conta_de_servico(info):
    # JWT assinado com a chave da conta de serviço → access token (escopo somente leitura)
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request
    cred = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
    cred.refresh(Request())
    return cred.token


def consultas(token):
    fim = datetime.date.today() - datetime.timedelta(days=2)
    ini = fim - datetime.timedelta(days=90)
    body = json.dumps({"startDate": ini.isoformat(), "endDate": fim.isoformat(), "dimensions": ["query"], "rowLimit": 500}).encode()
    url = "https://searchconsole.googleapis.com/webmasters/v3/sites/" + urllib.request.quote(PROPRIEDADE, safe="") + "/searchAnalytics/query"
    req = urllib.request.Request(url, data=body, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req).read()).get("rows", [])


def token_oauth(info):
    # refresh token de uma pessoa (o mesmo login Google do Lumied/Ads, com o escopo webmasters.readonly)
    import urllib.parse
    d = urllib.parse.urlencode({"client_id": info["client_id"], "client_secret": info["client_secret"],
                                "refresh_token": info["refresh_token"], "grant_type": "refresh_token"}).encode()
    return json.loads(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=d)).read())["access_token"]


def main():
    sa = os.environ.get("GSC_SERVICE_ACCOUNT_JSON", "").strip()
    oa = os.environ.get("GSC_OAUTH_JSON", "").strip()
    if not sa and not oa:
        print("sem GSC_SERVICE_ACCOUNT_JSON nem GSC_OAUTH_JSON — pauta segue a mão"); return 0
    token = token_da_conta_de_servico(json.loads(sa)) if sa else token_oauth(json.loads(oa))
    rows = consultas(token)
    pauta_path = os.path.join(ED, "pauta.md")
    pauta = open(pauta_path, encoding="utf-8").read()
    import unicodedata
    def chave(t):  # sem acento, minúsculas — "bilíngue" e "bilingue" são a mesma busca
        return unicodedata.normalize("NFKD", t.lower()).encode("ascii", "ignore").decode()
    ja = chave(pauta)
    candidatos = []
    for r in rows:
        q = r["keys"][0].lower()
        if "maple" in q or "bear" in q:
            continue
        palavras = [w for w in chave(q).split() if len(w) > 2]
        # uma palavra só ("bilingue") não é tema; e se todas as palavras da busca já
        # aparecem juntas num tema da pauta, é o mesmo assunto com outra grafia
        if len(palavras) < 2 or all(w in ja for w in palavras) and any(" ".join(palavras[i:i+2]) in ja for i in range(len(palavras) - 1)):
            continue
        if r["impressions"] >= 20 and 4 <= r["position"] <= 30 and r["ctr"] < 0.02:
            candidatos.append((r["impressions"], q, r["position"]))
    candidatos.sort(reverse=True)
    novos = candidatos[:3]
    if not novos:
        print("nada novo no Search Console"); return 0
    m = re.search(r"(## A escrever[^\n]*\n)((?:\d+\.[^\n]*\n?)+)", pauta)
    itens = [re.sub(r"^\d+\.\s*", "", l).strip() for l in m.group(2).splitlines() if l.strip()]
    for imp, q, pos in novos:
        itens.append(f'{q[0].upper() + q[1:]}: o que a família quer saber quando busca isso (busca: "{q}" — {imp} impressões, posição {pos:.0f}, do Search Console)')
    lista = "".join(f"{n}. {i}\n" for n, i in enumerate(itens, 1))
    open(pauta_path, "w", encoding="utf-8", newline="\n").write(pauta[:m.start(2)] + lista + pauta[m.end(2):])
    print("pauta +", len(novos), [q for _, q, _ in novos])
    return 0


if __name__ == "__main__":
    sys.exit(main())
