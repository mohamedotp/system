import { execSync } from 'child_process';

try {
    const port = 3001;
    console.log(`Checking port ${port}...`);

    // Find PID on port
    const stdout = execSync(`netstat -ano | findstr LISTENING | findstr :${port}`).toString();
    const match = stdout.match(/LISTENING\s+(\d+)/);

    if (match && match[1]) {
        const pid = match[1];
        console.log(`Killing process ${pid} on port ${port}...`);
        execSync(`taskkill /F /PID ${pid}`);
        console.log('Port cleared.');
    } else {
        console.log('Port is already clear.');
    }
} catch  {
    // If netstat finds nothing, it throws an error in some shells, so we just catch it
    console.log('Port is already clear.');
}
