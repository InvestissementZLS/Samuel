const fs = require('fs');
const path = require('path');

const invoicePath = path.join(__dirname, 'components/invoices/invoice-form.tsx');
let content = fs.readFileSync(invoicePath, 'utf8');

// The goal is to reshape the return statement.
// Since it's huge, we'll replace specific div classes to implement the split screen.

// 1. Outer wrapper
content = content.replace(
    /className="bg-\[#1e1e1e\] text-gray-300 p-6 rounded-lg shadow-xl max-w-5xl mx-auto font-sans"/g,
    'className="bg-gray-900/40 backdrop-blur-md border border-gray-800 text-gray-300 rounded-2xl shadow-2xl overflow-hidden max-w-[1400px] mx-auto font-sans"'
);

// 2. Header
content = content.replace(
    /<div className="flex justify-between items-start mb-8 border-b border-gray-800 pb-6">/g,
    '<div className="flex justify-between items-center p-6 bg-gray-900/60 border-b border-gray-800">'
);
content = content.replace(
    /<div className="p-2 bg-gray-800 rounded-lg">/g,
    '<div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-indigo-500/30">'
);

// 3. Inject the start of the split screen right after InvoicePreviewDialog
// We find: onClose={() => setIsPreviewOpen(false)} ... />}  )}
const dialogEndIndex = content.indexOf(')}', content.indexOf('<InvoicePreviewDialog')) + 2;
const beforeDialog = content.substring(0, dialogEndIndex);
const afterDialog = content.substring(dialogEndIndex);

const splitStart = `

            <div className="flex flex-col lg:flex-row min-h-[calc(100vh-12rem)]">
                {/* Left Panel: Primary Content */}
                <div className="flex-1 p-8 lg:border-r border-gray-800/60 overflow-y-auto space-y-10 custom-scrollbar">`;

// 4. Change Metadata grid from 3 cols to 2
let modifiedAfterDialog = afterDialog.replace(
    /<div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">/g,
    '<div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8 mb-8">'
);

// 5. Wrap the Items Table & Footer separation
// We need to close the left panel and open the right sticky panel right before {/* Footer / Totals */}
modifiedAfterDialog = modifiedAfterDialog.replace(
    /\{\/\* Footer \/ Totals \*\/\}/g,
    `</div>
                
                {/* Right Panel: Sticky Summary Settings */}
                <div className="w-full lg:w-[400px] bg-gray-900/30 p-8 shadow-inner">
                    <div className="sticky top-8 space-y-8">
                        <h3 className="text-lg font-semibold text-white border-b border-gray-800 pb-3">{t.quotes.summary}</h3>`
);

// 6. Fix the Footer flex container which was meant to be horizontal
modifiedAfterDialog = modifiedAfterDialog.replace(
    /<div className="flex flex-col md:flex-row gap-8">/g,
    '<div className="flex flex-col gap-8">' // Stack vertically in the sidebar
);

// 7. Remove the w-full md:w-80 from the totals so it takes full width of the sidebar
modifiedAfterDialog = modifiedAfterDialog.replace(
    /<div className="w-full md:w-80 space-y-4">/g,
    '<div className="w-full space-y-6 bg-gray-800/40 rounded-xl p-5 border border-gray-700/50">'
);

// 8. Close the split screen flex container right before the last closing div
modifiedAfterDialog = modifiedAfterDialog.replace(
    /        <\/div>\n    \);\n}/g,
    `                    </div>
                </div>
            </div>
        </div>
    );
}`
);

fs.writeFileSync(invoicePath, beforeDialog + splitStart + modifiedAfterDialog);
console.log("Successfully transformed InvoiceForm!");
