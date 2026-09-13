const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
});

const sourceFiles = project.getSourceFiles();

sourceFiles.forEach(sourceFile => {
    // 1. Fix implicit any in function parameters
    const functions = [
        ...sourceFile.getFunctions(),
        ...sourceFile.getVariableDeclarations()
            .map(v => v.getInitializerIfKind(SyntaxKind.ArrowFunction) || v.getInitializerIfKind(SyntaxKind.FunctionExpression))
            .filter(f => f != null),
        ...sourceFile.getClasses().flatMap(c => c.getMethods()),
        ...sourceFile.getClasses().flatMap(c => c.getConstructors())
    ];

    functions.forEach(func => {
        func.getParameters().forEach(param => {
            if (!param.getTypeNode() && !param.getInitializer()) {
                const name = param.getName();
                
                // Heuristics for basic types
                if (name === 'e' || name === 'event') param.setType('any');
                else if (name === 'id' || name.endsWith('Id')) param.setType('string');
                else if (name === 'index' || name === 'idx' || name === 'count') param.setType('number');
                else if (name === 'show' || name === 'isOpen' || name.startsWith('is') || name.startsWith('has')) param.setType('boolean');
                else if (name === 'data' || name === 'payload' || name === 'item' || name === 'settings') param.setType('any');
                else if (name === 'children') param.setType('React.ReactNode');
                else if (name === 'url' || name === 'path' || name === 'name') param.setType('string');
                else param.setType('any');
            }
        });
    });

    // 2. Fix empty state: useState(null) -> useState<any | null>(null)
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    callExpressions.forEach(call => {
        if (call.getExpression().getText() === 'useState') {
            if (call.getTypeArguments().length === 0) {
                const args = call.getArguments();
                if (args.length > 0 && args[0].getText() === 'null') {
                    call.insertTypeArguments(0, ['any | null']);
                } else if (args.length > 0 && args[0].getText() === '[]') {
                    call.insertTypeArguments(0, ['any[]']);
                } else if (args.length > 0 && args[0].getText() === '{}') {
                    call.insertTypeArguments(0, ['any']);
                }
            }
        }
    });

    // 3. Fix map implicit anys: array.map((item, index) => ...)
    const arrowFunctions = sourceFile.getDescendantsOfKind(SyntaxKind.ArrowFunction);
    arrowFunctions.forEach(arrow => {
        arrow.getParameters().forEach(param => {
            if (!param.getTypeNode() && !param.getInitializer()) {
                 const name = param.getName();
                 if (name === 'index' || name === 'i') param.setType('number');
                 else param.setType('any');
            }
        });
    });
});

project.saveSync();
console.log("Auto-typed successfully.");
