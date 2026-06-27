import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist', 'build', 'release', 'node_modules', '*.config.js', '*.config.ts', '*.config.cjs'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: '19.2.7' },
    },
    rules: {
      ...tseslint.configs['flat/eslint-recommended'].rules,
      ...tseslint.configs['flat/recommended'].rules,
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
      ...prettier.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unknown-property': [
        'error',
        {
          ignore: [
            'args',
            'attach',
            'array',
            'count',
            'itemSize',
            'position',
            'quaternion',
            'map',
            'transparent',
            'opacity',
            'side',
            'wireframe',
            'object',
            'rotation',
            'intensity',
            'emissive',
            'emissiveIntensity',
            'toneMapped',
            'skyColor',
            'groundColor',
            'metalness',
            'roughness',
            'normalMap',
            'normalScale',
          ],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
