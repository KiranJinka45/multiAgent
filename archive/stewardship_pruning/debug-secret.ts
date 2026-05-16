import { SecretProvider } from './packages/config/src';

async function test() {
    console.log('SecretProvider:', SecretProvider);
    if (SecretProvider && typeof SecretProvider.bootstrap === 'function') {
        console.log('✅ bootstrap is a function');
    } else {
        console.log('❌ bootstrap is NOT a function');
    }
}

test();
