const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);

function flattenMessage(args) {
    return args
        .map((arg) => {
            if (typeof arg === 'string') {
                return arg;
            }

            if (arg instanceof Error) {
                return `${arg.name}: ${arg.message}`;
            }

            return '';
        })
        .join(' ');
}

function isKnownTestWarning(args) {
    const message = flattenMessage(args);

    return message.includes('[baseline-browser-mapping]')
        || message.includes('Warning: `ReactDOMTestUtils.act` is deprecated in favor of `React.act`');
}

console.warn = (...args) => {
    if (isKnownTestWarning(args)) {
        return;
    }

    originalWarn(...args);
};

console.error = (...args) => {
    if (isKnownTestWarning(args)) {
        return;
    }

    originalError(...args);
};
