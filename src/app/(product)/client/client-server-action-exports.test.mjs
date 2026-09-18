import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function parse(relative, source = read(relative)) {
  return ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function hasExportModifier(node) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function runtimeExports(relative, source) {
  const file = parse(relative, source);
  const exports = [];

  for (const statement of file.statements) {
    if (!hasExportModifier(statement)) continue;
    if (ts.isFunctionDeclaration(statement)) {
      exports.push({ kind: 'function', name: statement.name?.text, async: Boolean(statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword)) });
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) exports.push({ kind: 'variable', name: ts.isIdentifier(declaration.name) ? declaration.name.text : undefined });
      continue;
    }
    if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) continue;
    exports.push({ kind: ts.SyntaxKind[statement.kind] });
  }

  return exports;
}

function assertOnlyNamedAsyncAction(relative, actionName, source) {
  assert.deepEqual(runtimeExports(relative, source), [{ kind: 'function', name: actionName, async: true }]);
}

function assertIdleActionState(relative, actionName, stateName) {
  const file = parse(relative);
  let idleState = false;
  let matchingUseActionState = false;

  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === stateName && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      idleState = node.initializer.properties.some((property) => ts.isPropertyAssignment(property)
        && ts.isIdentifier(property.name)
        && property.name.text === 'status'
        && ts.isStringLiteral(property.initializer)
        && property.initializer.text === 'idle');
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'useActionState') {
      matchingUseActionState = ts.isIdentifier(node.arguments[0])
        && node.arguments[0].text === actionName
        && ts.isIdentifier(node.arguments[1])
        && node.arguments[1].text === stateName;
    }
    ts.forEachChild(node, visit);
  }

  visit(file);
  assert.ok(idleState, `${relative} defines ${stateName} as the idle state`);
  assert.ok(matchingUseActionState, `${relative} passes ${stateName} to useActionState for ${actionName}`);
}

const actions = [
  { action: 'loginAction', actionPath: 'src/app/(product)/client/login/action.ts', formPath: 'src/app/(product)/client/login/login-form.tsx', state: 'initialLoginActionState' },
  { action: 'changeClientPinAction', actionPath: 'src/app/(product)/client/change-pin/action.ts', formPath: 'src/app/(product)/client/change-pin/change-pin-form.tsx', state: 'initialChangePinActionState' },
];

test('client Server Action modules export only their named async actions', () => {
  for (const { action, actionPath } of actions) assertOnlyNamedAsyncAction(actionPath, action);
});

test('client forms retain matching idle useActionState values', () => {
  for (const { action, formPath, state } of actions) assertIdleActionState(formPath, action, state);
});

test('runtime object exports are rejected from client Server Action modules', () => {
  for (const { action, actionPath } of actions) {
    const mutation = `export const invalidInitialState = { status: 'idle' };\n${read(actionPath)}`;
    assert.throws(() => assertOnlyNamedAsyncAction(actionPath, action, mutation));
  }
});
