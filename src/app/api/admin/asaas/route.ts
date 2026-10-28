import { requireUser } from '@/lib/auth';
import { AsaasGateway } from '@/lib/payments/asaas.provider';
import { sandboxDiagnostic } from '@/lib/payments/sandbox-diagnostic';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return sandboxDiagnostic(request, {
    authorize: () => requireUser(true),
    probe: () => new AsaasGateway().checkSandboxConnection(),
  });
}
