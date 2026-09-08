export const TOUR_SCRIPT = [
    {
        id: "intro_1",
        speaker: "Voltz",
        portrait: "assets/characters/voltz_happy.jpg",
        text: "Olá, visitante! Eu sou o Voltz, mascote de energia da Fecart 2026. Bem-vindo à nossa cidade inteligente do futuro!",
        action: "look_center"
    },
    {
        id: "intro_2",
        speaker: "Voltz",
        portrait: "assets/characters/voltz_explain.jpg",
        text: "Nesta maquete 3D, todas as casas, indústrias e postes são controlados por Agentes de Inteligência Artificial autônomos.",
        action: "look_city"
    },
    {
        id: "intro_3",
        speaker: "Voltz",
        portrait: "assets/characters/voltz_explain.jpg",
        text: "Veja ali a Geração Distribuída! Os painéis solares fornecem energia limpa para aliviar a demanda da Usina durante o dia.",
        action: "look_solar"
    },
    {
        id: "intro_4",
        speaker: "Voltz",
        portrait: "assets/characters/voltz_happy.jpg",
        text: "E quando anoitece, o Agente de Horário de Pico entra em cena para iluminar tudo de forma inteligente...",
        action: "force_night"
    },
    {
        id: "crisis_1",
        speaker: "Voltz",
        portrait: "assets/characters/voltz_shocked.jpg",
        text: "OPA! O que foi isso?! Aconteceu uma sobrecarga e um cabo de transmissão principal se rompeu!",
        action: "break_line"
    },
    {
        id: "crisis_2",
        speaker: "Beto",
        portrait: "assets/characters/beto_panic.jpg",
        text: "Atenção no Centro de Controle!! Aqui é o Beto, o operador da Usina! Dois bairros apagaram e o Hospital Prontomed está perdendo força!",
        action: "shake_camera"
    },
    {
        id: "crisis_3",
        speaker: "Beto",
        portrait: "assets/characters/beto_panic.jpg",
        text: "Visitante, preciso da sua ajuda! Assuma o controle manual. Corte a energia não essencial da Indústria e ative a geração solar de emergência!",
        action: "start_minigame"
    },
    {
        id: "resolve_1",
        speaker: "Beto",
        portrait: "assets/characters/beto_relieved.jpg",
        text: "Ufa! A rede estabilizou! Você transferiu a carga a tempo e salvou o Hospital, muito obrigado!",
        action: "restore_power"
    },
    {
        id: "resolve_2",
        speaker: "Voltz",
        portrait: "assets/characters/voltz_happy.jpg",
        text: "Mandou bem! Mas sabe o que é melhor? Numa Smart Grid de verdade, nossos Agentes resolvem isso sozinhos em milissegundos usando grafos e Dijkstra! Fim do Tour!",
        action: "end_tour"
    }
];
