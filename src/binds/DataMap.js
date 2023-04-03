const babel = require('@babel/core');

module.exports = function ({ types: t }) {
    function buildDataMap(data, jsx) {
        const entries = Object.entries(data);
        const mapFunction = t.arrowFunctionExpression(
            [t.identifier('entry')],
            t.jsxElement(
                t.jsxOpeningElement(t.jsxIdentifier(jsx.type.name), jsx.props, jsx.selfClosing),
                jsx.children,
                jsx.closingElement,
            ),
        );
        const arrayMapCall = t.callExpression(t.memberExpression(t.arrayExpression(entries.map(([key]) => t.stringLiteral(key))), t.identifier('map')), [
            mapFunction,
        ]);
        const callExpression = t.callExpression(arrayMapCall, [t.objectExpression(entries.map(([key, value]) => t.objectProperty(t.identifier(key), value)))]);
        return callExpression;
    }

    return {
        visitor: {
            JSXElement(path) {
                const { openingElement } = path.node;
                const attributes = openingElement.attributes;

                let dataMapAttributeIndex = -1;
                for (let i = 0; i < attributes.length; i++) {
                    const attribute = attributes[i];
                    if (t.isJSXAttribute(attribute) && t.isJSXIdentifier(attribute.name, { name: '_dataMap' })) {
                        dataMapAttributeIndex = i;
                        break;
                    }
                }

                if (dataMapAttributeIndex !== -1) {
                    const dataMapAttribute = attributes[dataMapAttributeIndex];
                    const { value } = dataMapAttribute;
                    const { value: jsx } = path.node.children[0];

                    if (t.isJSXExpressionContainer(value)) {
                        const { expression } = value;
                        if (t.isObjectExpression(expression)) {
                            const callExpression = buildDataMap(expression.properties.reduce((acc, prop) => ({ ...acc, [prop.key.name]: prop.value }), {}), jsx);

                            path.replaceWith(t.jSXExpressionContainer(callExpression));
                        }
                    }
                    openingElement.attributes.splice(dataMapAttributeIndex, 1);
                }
            },
        },
    };
};
