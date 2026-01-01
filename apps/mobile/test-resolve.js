try {
    const path = require.resolve('promise/setimmediate/es6-extensions');
    console.log('Extensions resolved at:', path);

    const finallyPath = require.resolve('promise/setimmediate/finally');
    console.log('Finally resolved at:', finallyPath);

    console.log('SUCCESS');
} catch (error) {
    console.error('FAILED to resolve:', error.message);
}
