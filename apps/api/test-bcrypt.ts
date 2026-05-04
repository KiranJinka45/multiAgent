import bcrypt from "bcrypt";

async function main() {
    const plain = "Kiran@410";
    const hash = await bcrypt.hash(plain, 10);
    console.log("HASH:", hash);

    const ok = await bcrypt.compare(plain, hash);
    console.log("MATCH:", ok);
}

main().catch((err) => {
    console.error("BCRYPT TEST FAILED:", err);
    process.exit(1);
});