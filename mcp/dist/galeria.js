const itens = [];
// Personagens de exemplo. Depois viram uma tabela no Supabase.
const personagens = [
    {
        nome: "Porta-voz 3D",
        descricao: "Avatar 3D da dona da Viva Mais Bella, estilo animação 3D, simpática, cabelo e traços baseados nas fotos de referência.",
        referencias: [],
    },
];
export function salvarNaGaleria(tarefa) {
    if (tarefa.situacao !== "pronta" || !tarefa.resultadoUrl)
        return undefined;
    const existente = itens.find((i) => i.id === tarefa.id);
    if (existente)
        return existente;
    const item = {
        id: tarefa.id,
        tipo: tarefa.pedido.tipo,
        prompt: tarefa.pedido.promptOriginal ?? tarefa.pedido.prompt,
        formato: tarefa.pedido.formato,
        url: tarefa.resultadoUrl,
        criadoEm: new Date().toISOString(),
    };
    itens.unshift(item);
    return item;
}
export function listarGaleria(limite, tipo) {
    return itens.filter((i) => !tipo || i.tipo === tipo).slice(0, limite);
}
export function listarPersonagens() {
    return personagens;
}
export function buscarPersonagem(nome) {
    const alvo = nome.trim().toLowerCase();
    return personagens.find((p) => p.nome.toLowerCase() === alvo);
}
