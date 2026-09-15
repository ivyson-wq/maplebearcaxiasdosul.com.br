#!/usr/bin/env python3
"""Lê o Search Console e acrescenta à pauta as buscas que já mostram o site e ninguém clica.

Precisa de uma conta de serviço do Google com acesso (Completo ou Restrito) à propriedade
do site no Search Console. A chave JSON entra pela variável GSC_SERVICE_ACCOUNT_JSON
(na Action, o secret de mesmo nome). Sem a variável, o script sai sem fazer nada —
é o que permite ligar a Action antes de o acesso existir.

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


def main():
    raw = os.environ.get("GSC_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        print("sem GSC_SERVICE_ACCOUNT_JSON — pauta segue a mão"); return 0
    token = token_da_conta_de_servico(json.loads(raw))
    rows = consultas(token)
    pauta_path = os.path.join(ED, "pauta.md")
    pauta = open(pauta_path, encoding="utf-8").read()
    ja = pauta.lower()
    candidatos = []
    for r in rows:
        q = r["keys"][0].lower()
        if "maple" in q or "bear" in q:
            continue
        if r["impressions"] >= 20 and 4 <= r["position"] <= 30 and r["ctr"] < 0.02 and q not in ja:
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
