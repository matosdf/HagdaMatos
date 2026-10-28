import 'server-only';
import { AsaasApiError } from './asaas.provider';
import { failure, HttpError, json, requireOrigin } from '../http';

export async function sandboxDiagnostic(request: Request, dependencies: {
  authorize: () => Promise<unknown>; probe: () => Promise<void>;
}) {
  try {
    requireOrigin(request);
    await dependencies.authorize();
    await dependencies.probe();
    return json({ message: 'Conexão com o Asaas Sandbox confirmada. Nenhuma cobrança foi criada.' });
  } catch (error) {
    if (error instanceof AsaasApiError) {
      const message = [401, 403].includes(error.status)
        ? 'O Asaas recusou a chave ou a permissão. Confira a chave do Sandbox no Preview.'
        : 'O Asaas Sandbox está indisponível ou limitou a consulta. Tente novamente mais tarde.';
      return failure(new HttpError(503, message));
    }
    return failure(error);
  }
}
