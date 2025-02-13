const PORT = process.env.PORT || 3000;

const check = async () => {
    try {
        const response = await fetch(`http://localhost:${PORT}/health`);
        const data = await response.json();
        
        if (!response.ok || data.status !== 'ok') {
            process.exit(1);
        }
        process.exit(0);
    } catch (error) {
        process.exit(1);
    }
};

check();