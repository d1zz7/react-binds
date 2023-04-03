const babel = require('@babel/core');

module.exports = function ({ types: t }) {
    function buildForLoop(value, object, index, jsx) {
        const mapFunction = t.arrowFunctionExpression([t.identifier(index || 'i')], jsx);
        const arrayMapCall = t.callExpression(t.memberExpression(object, t.identifier('map')), [
            mapFunction,
        ]);
        return t.callExpression(arrayMapCall, [value]);
    }

    return {
        visitor: {
            JSXElement(path) {
                const { openingElement } = path.node;
                const attributes = openingElement.attributes;

                let forAttributeIndex = -1;
                for (let i = 0; i < attributes.length; i++) {
                    const attribute = attributes[i];
                    if (t.isJSXAttribute(attribute) && t.isJSXIdentifier(attribute.name, { name: '_for' })) {
                        forAttributeIndex = i;
                        break;
                    }
                }

                if (forAttributeIndex !== -1) {
                    const forAttribute = attributes[forAttributeIndex];
                    const { value } = forAttribute;
                    const { object, value: jsx } = path.node.children[0];

                    if (t.isJSXExpressionContainer(value)) {
                        const { expression } = value;
                        if (t.isStringLiteral(expression)) {
                            // handle array-like strings e.g. '_for(item in "abc")'
                            const index = expression.value;
                            const callExpression = buildForLoop(jsx, t.stringLiteral(expression.value), null, jsx);

                            path.replaceWith(t.jSXExpressionContainer(callExpression));
                        } else if (t.isBinaryExpression(expression) && expression.operator === 'in') {
                            // handle object property strings e.g. '_for(item in object)'
                            const index = expression.left.name;
                            const callExpression = buildForLoop(jsx, expression.right, index, jsx);

                            path.replaceWith(t.jSXExpressionContainer(callExpression));
                        }
                    }
                    openingElement.attributes.splice(forAttributeIndex, 1);
                }
            },
        },
    };
};
