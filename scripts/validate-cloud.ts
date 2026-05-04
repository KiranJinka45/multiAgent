import axios from 'axios';
import chalk from 'chalk';

const BACKEND_URL = 'https://ztan-backend.onrender.com';
const FRONTEND_URL = 'https://ztan-demo.vercel.app';

async function validate() {
    console.log(chalk.blue('🚀 Starting Cloud Production Validation...\n'));

    // 1. Backend Health Check
    console.log(chalk.yellow('Checking Backend Health...'));
    try {
        const res = await axios.get(`${BACKEND_URL}/health`);
        if (res.status === 200 && res.data.status === 'ok') {
            console.log(chalk.green('✔ Backend is ONLINE'));
        } else {
            console.log(chalk.red('✘ Backend health check failed'));
        }
    } catch (e: any) {
        console.log(chalk.red(`✘ Backend UNREACHABLE: ${e.message}`));
    }

    // 2. ZTAN Metrics Check
    console.log(chalk.yellow('\nChecking ZTAN Public Metrics...'));
    try {
        const res = await axios.get(`${BACKEND_URL}/api/v1/ztan/metrics`);
        console.log(chalk.cyan('ZTAN Metrics:'), JSON.stringify(res.data, null, 2));
        if (res.data.status === 'OPERATIONAL') {
            console.log(chalk.green('✔ ZTAN Protocol is OPERATIONAL'));
        }
    } catch (e: any) {
        console.log(chalk.red(`✘ ZTAN Metrics unreachable: ${e.message}`));
    }

    // 3. Frontend Availability
    console.log(chalk.yellow('\nChecking Frontend Deployment...'));
    try {
        const res = await axios.get(FRONTEND_URL);
        if (res.status === 200) {
            console.log(chalk.green('✔ Frontend is ACCESSIBLE'));
        }
    } catch (e: any) {
        console.log(chalk.red(`✘ Frontend UNREACHABLE: ${e.message}`));
    }

    // 4. Financial Demo Route
    console.log(chalk.yellow('\nChecking Financial Demo Route...'));
    try {
        const res = await axios.get(`${FRONTEND_URL}/demo/financial-approval`);
        if (res.status === 200) {
            console.log(chalk.green('✔ Financial Approval Demo route is VALID'));
        }
    } catch (e: any) {
        console.log(chalk.red(`✘ Financial Demo route unreachable: ${e.message}`));
    }

    console.log(chalk.blue('\n--- Validation Complete ---'));
    console.log(chalk.gray('Note: If services are not yet deployed, these checks will fail.'));
}

validate();
