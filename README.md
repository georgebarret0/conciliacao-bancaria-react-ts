# Conciliação Bancária React TS

Ferramenta web em React + TypeScript para simular uma rotina de conciliação bancária entre extrato bancário e lançamentos internos.

O projeto foi criado como demo de portfólio para demonstrar interface corporativa, processamento de dados financeiros, regras de comparação, importação CSV e organização de código frontend moderno.

## Preview

Demo online: https://georgebarret0.github.io/conciliacao-bancaria-react-ts/

![Preview da conciliação bancária](conciliacao-preview.png)

## Stack

- React
- TypeScript
- Vite
- PapaParse para leitura de CSV
- Lucide React para ícones

## Funcionalidades

- Comparação entre extrato bancário e lançamentos internos.
- Classificação automática por status:
  - Conciliado
  - Divergência de valor
  - Divergência de data
  - Sem lançamento interno
  - Sem movimento bancário
  - Revisão manual
- Configuração de tolerância de valor e dias.
- Filtro por status e busca por documento/descrição.
- Importação de CSV para extrato e lançamentos internos.
- Exportação do resultado conciliado em CSV.
- Layout responsivo para desktop e mobile.

## Como rodar

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
```

Preview local:

```bash
npm run preview
```

## Demo local no AppServ

Depois do build, os arquivos ficam em `dist/` e podem ser servidos como site estático.

```text
C:\AppServ\www\git\conciliacao-bancaria-react-ts\dist
```

## Arquivos CSV

Os modelos de CSV ficam em:

```text
public/examples/extrato-bancario.csv
public/examples/lancamentos-internos.csv
```

Formato do extrato:

```csv
id,date,description,document,amount,account,direction
bank-001,2026-05-02,PIX CLIENTE ACME PED-10482,PED-10482,42800,Banco Principal,credit
```

Formato dos lançamentos internos:

```csv
id,expectedDate,description,document,amount,costCenter,direction
entry-001,2026-05-02,Recebimento pedido PED-10482,PED-10482,42800,Comercial Recife,credit
```

## Regra de conciliação

A rotina compara registros por documento, valor, data e descrição. Quando encontra um documento correspondente, classifica o resultado conforme as tolerâncias configuradas:

- valor dentro da tolerância + data dentro da tolerância: conciliado;
- documento encontrado + valor divergente: divergência de valor;
- documento encontrado + data divergente: divergência de data;
- movimento bancário sem interno: pendente no sistema;
- interno sem banco: pendente no banco.

## Objetivo técnico

Este projeto mostra uma rotina comum em sistemas financeiros corporativos: leitura de dados, normalização, aplicação de regras, classificação de divergências e apresentação operacional para tomada de decisão.
