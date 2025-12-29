module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    env: {
        node: true,
        es2022: true,
    },
    rules: {
        // Allow console.log for debugging (can disable in production)
        'no-console': 'off',

        // Require explicit return types on functions (helps catch bugs)
        '@typescript-eslint/explicit-function-return-type': 'warn',

        // Disallow unused variables (keeps code clean)
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

        // Allow any type when necessary (but warn)
        '@typescript-eslint/no-explicit-any': 'warn',
    },
};
