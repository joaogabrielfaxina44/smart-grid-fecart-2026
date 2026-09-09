export const TOUR_SCRIPT = [
    {
        id: "intro_1",
        speaker: "Voltz",
        portrait: "assets/characters/voltz_happy.jpg",
        text: "Olá! Eu sou o Voltz, seu guia nesta incrível maquete viva. Bem-vindos à Fecart 2026!",
        action: "look_center"
    },
    {
        id: "intro_2",
        speaker: "Voltz",
        portrait: "assets/characters/voltz_explain.jpg",
        text: "O que vocês estão vendo não é só uma maquete bonita. É uma verdadeira Smart Grid controlada por Inteligência Artificial em tempo real!",
        action: "look_center_zoom"
    },
    {
        id: "bairros",
        speaker: "Voltz",
        portrait: "assets/characters/voltz_explain.jpg",
        text: "Nossos bairros residenciais consomem muita energia, mas aqui eles são inteligentes. A energia é distribuída de forma dinâmica pelas subestações.",
        action: "look_residential"
    },
    {
        id: "hospitais",
        speaker: "Voltz",
        portrait: "assets/characters/voltz_happy.jpg",
        text: "Aqui temos o Hospital Prontomed. Instalações críticas como esta têm prioridade máxima na nossa rede. Se faltar energia, a IA protege este setor!",
        action: "look_hospital"
    },
    {
        id: "comercial",
        speaker: "Voltz",
        portrait: "assets/characters/voltz_explain.jpg",
        text: "Vejam o Centro Comercial lá embaixo! Ele demanda muita energia de dia. À noite, a carga diminui e o sistema redireciona o excedente.",
        action: "look_commercial_top"
    },
    {
        id: "fontes",
        speaker: "Voltz",
        portrait: "assets/characters/voltz_explain.jpg",
        text: "E de onde vem nossa força? Daqui! Nossa Geração Distribuída conta com um parque solar avançado e baterias de armazenamento...",
        action: "look_solar"
    },
    {
        id: "fontes2",
        speaker: "Voltz",
        portrait: "assets/characters/voltz_happy.jpg",
        text: "...além da nossa fazenda eólica, garantindo energia 100% limpa e renovável. É assim que garantimos sustentabilidade!",
        action: "look_wind"
    },
    {
        id: "geral",
        speaker: "Voltz",
        portrait: "assets/characters/voltz_explain.jpg",
        text: "Toda essa complexidade invisível flui pelas nossas linhas de transmissão brilhantes. É uma dança perfeita entre algoritmos e física!",
        action: "look_city_overview"
    },
    {
        id: "crise_1",
        speaker: "Voltz",
        portrait: "assets/characters/voltz_shocked.jpg",
        text: "OPA! O que foi isso?! Uma falha gravíssima na Usina Central acaba de ocorrer! Cuidado!",
        action: "break_plant"
    },
    {
        id: "crise_2",
        speaker: "Beto",
        portrait: "assets/characters/beto_panic.jpg",
        text: "ALERTA VERMELHO NO CENTRO DE CONTROLE! Aqui é o Beto, operador chefe! Perdemos nossa principal linha de transmissão e o Hospital está isolado!",
        action: "shake_camera_hospital"
    },
    {
        id: "crise_3",
        speaker: "Beto",
        portrait: "assets/characters/beto_panic.jpg",
        text: "Precisamos da sua ajuda para salvar a cidade antes que seja tarde! Utilize o painel de emergência e faça a escolha correta para restaurar a energia!",
        action: "start_minigame"
    },
    {
        id: "resolve_1",
        speaker: "Beto",
        portrait: "assets/characters/beto_relieved.jpg",
        text: "UFA! Você conseguiu! A carga industrial foi cortada e os geradores solares ativados com sucesso! O Hospital está salvo!",
        action: "restore_power"
    },
    {
        id: "resolve_2",
        speaker: "Voltz",
        portrait: "assets/characters/voltz_happy.jpg",
        text: "Isso foi incrível! Mas sabe qual é a melhor parte? Numa Smart Grid real, o nosso Agente 'Self-Healing' tomaria exatamente essa atitude em menos de 1 segundo! Obrigado por visitar nosso stand!",
        action: "end_tour"
    }
];
