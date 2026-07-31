# Painel de Investimentos

Continuação do protótipo feito no Claude web (`dashboard-investimentos (9).jsx`), agora como um projeto
completo com backend próprio e banco de dados real (SQLite), em vez do `window.storage` do sandbox de artifacts.

## Estrutura

```
Investimento/
├── server/           API (Express) + banco SQLite
│   ├── src/
│   │   ├── db.js         conexão e schema do banco (usa node:sqlite, nativo do Node)
│   │   ├── seedData.js    lista padrão de ativos + planilha de lançamentos de 2026
│   │   ├── routes/
│   │   │   ├── entries.js  CRUD de lançamentos + importação da planilha 2026
│   │   │   └── ativos.js   CRUD da lista de ativos
│   │   └── index.js       servidor Express
│   └── data.db        arquivo do banco (criado automaticamente, ignorado no git)
├── client/            Frontend (Vite + React)
│   └── src/
│       ├── App.jsx            componente principal (painel, abas, gráficos)
│       ├── api.js             chamadas para a API
│       ├── constants.js       paleta de cores, tipos de ativo, metas
│       ├── utils.js           formatação de moeda/data
│       └── components/        Charts, EntryForm, LancamentosTab, AssetsManager etc.
└── package.json       scripts raiz (roda client + server juntos)
```

Banco de dados: usamos o módulo `node:sqlite`, embutido no próprio Node.js (18+/22+/24+), então não há
dependência nativa para compilar (foi por isso que a instalação inicial com `better-sqlite3` falhou — faltava
Python/build tools no seu PC. Trocamos por essa alternativa sem esse problema).

## Como rodar localmente

Pré-requisito: Node.js (você já tem, v24.18.1).

```powershell
npm install        # instala tudo (client + server), só precisa rodar uma vez
npm run dev         # sobe API em http://localhost:4000 e o frontend em http://localhost:5173
```

Abra http://localhost:5173 no navegador. O frontend fala com a API via proxy (`/api/...`).

Scripts úteis:
- `npm run dev:server` — só a API
- `npm run dev:client` — só o frontend
- `npm run build` — build de produção do frontend (gera `client/dist`)

## Dados

- O botão **"Importar planilha 2026"** na aba Lançamentos insere os 58 lançamentos que estavam no arquivo
  original (`IMPORT_2026`), sem duplicar se já existirem (mesma lógica de dedupe do protótipo). Já testei e
  os dados estão no banco (`server/data.db`).
- A lista de ativos vem pré-cadastrada com os mesmos ativos padrão do protótipo.
- Tudo o que você adicionar/editar/excluir na interface agora persiste de verdade no arquivo `server/data.db`
  (SQLite), não mais em storage temporário de sessão.

## Deploy (você pediu "hospedado")

Como o banco é um arquivo SQLite, a plataforma de deploy precisa oferecer **disco persistente** (Vercel, por
exemplo, não serve pra isso porque o filesystem é efêmero). Duas opções diretas:

1. **Railway** ou **Render** — sobem o `server/` como um serviço Node com um volume persistente montado, e o
   `client/` como build estático (ou você serve o `client/dist` a partir do próprio Express). Mais simples de
   configurar com SQLite.
2. **Fly.io** — também suporta volumes persistentes, um pouco mais manual.

Quando você quiser seguir com isso, me diga qual plataforma prefere que eu preparo a configuração
(Dockerfile / variáveis de ambiente / servir o front pelo Express) — é uma etapa que envolve criar conta e
publicar em serviço externo, então prefiro fazer isso com você acompanhando.
