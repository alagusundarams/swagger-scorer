
async function test() {
    console.log('--- ADMIN TEST (No params) ---');
    const resAdmin = await fetch('http://localhost:3001/api/v1/products');
    const dataAdmin = await resAdmin.json();
    console.log('Count:', dataAdmin.length);

    console.log('\n--- PRODUCER TEST (role=user, teamId=team-payments) ---');
    const resProd = await fetch('http://localhost:3001/api/v1/products?role=user&teamId=team-payments');
    const dataProd = await resProd.json();
    console.log('Count:', dataProd.length);
    if (dataProd.length > 0) {
        console.log('First Item ownerTeamId:', dataProd[0].ownerTeamId);
    }

    console.log('\n--- SUBSCRIPTIONS TEST ---');
    const resSub = await fetch('http://localhost:3001/api/v1/subscriptions');
    const dataSub = await resSub.json();
    console.log('Count:', dataSub.length);
}

test();
