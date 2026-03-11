
import Docker from 'dockerode';
try {
    const docker = new Docker();
    console.log('Successfully imported dockerode');
    console.log('Docker version:', docker.version());
} catch (error) {
    console.error('Failed to import or initialize dockerode:', error);
}
