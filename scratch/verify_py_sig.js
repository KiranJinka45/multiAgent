const bls = require('@noble/bls12-381');
const DST = 'BLS_SIG_ZTAN_AUDIT_V1';

async function main() {
  const h3 = "e8bebb06cb303e0d09131a289ec1048a360817cd82d44a92c2c06df51a2f9f69";
  const msg = Buffer.from(h3, 'hex');
  
  const masterPk = "89ece308f9d1f0131765212deca99697b112d61f9be9a5f1f3780a51335b3ff981747a0b2ca2179b96d2c0c9024e5224";
  const pyAggSig = "a95faecf97630a18a309f36793e34b6948328ccfd66fc0449f41d33e575e59a7126f3bba8bb612d584f05e4d4dd26275158d60e2795780560da49fab9760ecacaeee495ebbd82829f5b2cd280d980aada5d902c602c189baf6d13e0981266b1b";

  try {
    const isValid = await bls.verify(
      Buffer.from(pyAggSig, 'hex'),
      msg,
      Buffer.from(masterPk, 'hex'),
      { dst: DST }
    );
    console.log(`Node Verification of Py Sig: ${isValid}`);
  } catch (err) {
    console.error(`Verification error: ${err.message}`);
  }
}

main();
