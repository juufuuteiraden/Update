import fs from 'fs';

const filePath = 'e:/Resort/src/pages/Packages.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Close packages-container div before </section>

    </section>`;

const newStr = `      </AdminModal>
      </div>
    </section>`;

if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Added missing </div> for packages-container');
} else {
    console.log('FAIL: Pattern not found');
    const idx = content.indexOf('</AdminModal>');
    if (idx >= 0) console.log('Context:', JSON.stringify(content.substring(idx, idx + 100)));
}
