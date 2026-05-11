export const bankCsvTemplate = [
  "id,date,description,document,amount,account,direction",
  "bank-001,2026-05-02,PIX CLIENTE ACME PED-10482,PED-10482,42800,Banco Principal,credit",
  "bank-002,2026-05-03,TED LOJA VIRTUAL B2B PED-10491,PED-10491,18540,Banco Principal,credit",
].join("\n");

export const internalCsvTemplate = [
  "id,expectedDate,description,document,amount,costCenter,direction",
  "entry-001,2026-05-02,Recebimento pedido PED-10482,PED-10482,42800,Comercial Recife,credit",
  "entry-002,2026-05-03,Recebimento loja B2B PED-10491,PED-10491,18540,E-commerce,credit",
].join("\n");
