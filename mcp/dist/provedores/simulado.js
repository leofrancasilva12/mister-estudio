import { randomUUID } from "node:crypto";
// Provedor de mentira: finge que gera e devolve uma imagem de exemplo.
// Serve para testar a conexão com o Claude sem gastar créditos do Kie.ai.
const tamanhos = {
    "1:1": "1080x1080",
    "4:5": "1080x1350",
    "9:16": "1080x1920",
    "16:9": "1920x1080",
};
export function criarProvedorSimulado(segundos) {
    const tarefas = new Map();
    const duracaoMs = Math.max(1, segundos) * 1000;
    function atualizar(tarefa, inicio) {
        if (tarefa.situacao === "pronta" || tarefa.situacao === "falhou")
            return tarefa;
        const decorrido = Date.now() - inicio;
        const progresso = Math.min(100, Math.round((decorrido / duracaoMs) * 100));
        if (progresso >= 100) {
            const texto = encodeURIComponent(`${tarefa.pedido.tipo === "video" ? "Vídeo simulado" : "Imagem simulada"} · ${tarefa.pedido.formato}`);
            tarefa.situacao = "pronta";
            tarefa.progresso = 100;
            tarefa.resultadoUrl = `https://placehold.co/${tamanhos[tarefa.pedido.formato]}/png?text=${texto}`;
        }
        else {
            tarefa.situacao = progresso < 10 ? "na_fila" : "gerando";
            tarefa.progresso = progresso;
        }
        return tarefa;
    }
    const inicios = new Map();
    return {
        nome: "simulado",
        async iniciar(pedido) {
            const tarefa = {
                id: randomUUID(),
                pedido,
                situacao: "na_fila",
                progresso: 0,
                criadaEm: new Date().toISOString(),
            };
            tarefas.set(tarefa.id, tarefa);
            inicios.set(tarefa.id, Date.now());
            return { ...tarefa };
        },
        async consultar(id) {
            const tarefa = tarefas.get(id);
            if (!tarefa)
                return undefined;
            return { ...atualizar(tarefa, inicios.get(id) ?? Date.now()) };
        },
    };
}
