const fs = require('fs');
const file = 'src/modules/cctv/stream.service.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("import { ProviderConfigurationError, ProviderTransientError }")) {
  content = content.replace(
    "import { Logger } from '@/lib/logger/logger';",
    "import { Logger } from '@/lib/logger/logger';\nimport { ProviderConfigurationError, ProviderTransientError } from '@/lib/observability/errors';"
  );
}

content = content.replace(
  "throw new Error(`MediaMTX Config Error: ${body.error}`);",
  "throw new ProviderConfigurationError(`MediaMTX Config Error: ${body.error}`);"
);

content = content.replace(
  "throw new Error('MediaMTX API Error: HTTP 400 with non-JSON response');",
  "throw new ProviderTransientError('MediaMTX API Error: HTTP 400 with non-JSON response');"
);

content = content.replace(
  "throw new Error('MediaMTX API Error: HTTP 400 with missing error field');",
  "throw new ProviderTransientError('MediaMTX API Error: HTTP 400 with missing error field');"
);

content = content.replace(
  "throw new Error(`MediaMTX provisioning failed with status: ${response.status}`);",
  "throw new ProviderTransientError(`MediaMTX provisioning failed with status: ${response.status}`);"
);

content = content.replace(
  "throw new Error('Internal stream provisioning error');",
  "throw new ProviderTransientError('Internal stream provisioning error');"
);

fs.writeFileSync(file, content);
console.log('done');
