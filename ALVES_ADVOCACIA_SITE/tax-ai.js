class TaxAI {
    constructor() {
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
        this.model = 'gpt-4o-mini';
        this.phone = localStorage.getItem('ALVES_LEAD_PHONE') || '5511998274209';
        this.init();
    }

    init() {
        this.injectStyles();
        this.injectHTML();
        this.setupListeners();
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .chat-widget { position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: 'Inter', sans-serif; }
            .chat-button { width: 60px; height: 60px; background: #c5a059; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 10px 25px rgba(0,0,0,0.3); transition: all 0.3s ease; border: none; outline: none; }
            .chat-button:hover { transform: scale(1.1) rotate(5deg); background: #d4b47a; }
            .chat-status { position: absolute; top: 0; right: 0; width: 15px; height: 15px; background: #ff4d4d; border-radius: 50%; border: 2px solid white; }
            
            .chat-window { position: absolute; bottom: 80px; right: 0; width: 350px; height: 500px; background: #0a0e14; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; display: none; flex-direction: column; overflow: hidden; box-shadow: 0 15px 50px rgba(0,0,0,0.5); backdrop-filter: blur(10px); }
            .chat-header { background: #c5a059; padding: 15px 20px; color: black; display: flex; align-items: center; justify-content: space-between; }
            .chat-header h4 { margin: 0; font-family: 'Outfit'; font-weight: 700; font-size: 1rem; }
            
            .chat-messages { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 15px; color: #e0e6ed; font-size: 0.9rem; }
            .msg { max-width: 80%; padding: 10px 15px; border-radius: 15px; line-height: 1.4; }
            .msg-user { align-self: flex-end; background: #c5a059; color: black; border-bottom-right-radius: 2px; }
            .msg-ai { align-self: flex-start; background: rgba(255,255,255,0.05); border-bottom-left-radius: 2px; }
            
            .chat-input-area { padding: 15px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 10px; }
            .chat-input { flex: 1; background: transparent; border: none; color: white; outline: none; font-size: 0.9rem; }
            .chat-send { background: transparent; border: none; color: #c5a059; cursor: pointer; font-weight: 700; }
        `;
        document.head.appendChild(style);
    }

    injectHTML() {
        const div = document.createElement('div');
        div.className = 'chat-widget';
        div.innerHTML = `
            <div class="chat-window" id="alves-chat-window">
                <div class="chat-header">
                    <h4>RentalAI</h4>
                    <span style="cursor:pointer; font-size: 1.5rem;" onclick="document.getElementById('alves-chat-window').style.display='none'">&times;</span>
                </div>
                <div class="chat-messages" id="alves-chat-msgs">
                    <div class="msg msg-ai">Olá! Sou o especialista em Reforma Tributária da Alves Advocacia. Como posso ajudar sua locadora hoje?</div>
                </div>
                <div class="chat-input-area">
                    <input type="text" class="chat-input" id="alves-chat-input" placeholder="Digite sua dúvida...">
                    <button class="chat-send" id="alves-chat-btn">Enviar</button>
                </div>
            </div>
            <button class="chat-button" onclick="const w = document.getElementById('alves-chat-window'); w.style.display = w.style.display === 'flex' ? 'none' : 'flex'">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <div class="chat-status" id="alves-chat-dot"></div>
            </button>
        `;
        document.body.appendChild(div);
        this.updateStatus(!!(localStorage.getItem('ALVES_OPENAI_KEY') || localStorage.getItem('ALVES_GEMINI_KEY')));
    }

    setupListeners() {
        const btn = document.getElementById('alves-chat-btn');
        const input = document.getElementById('alves-chat-input');
        
        btn.onclick = () => this.handleSend();
        input.onkeypress = (e) => { if(e.key === 'Enter') this.handleSend(); };
    }

    async handleSend() {
        const input = document.getElementById('alves-chat-input');
        const text = input.value.trim();
        if(!text) return;

        this.addMessage(text, 'user');
        input.value = '';

        const thinkingMsg = this.addMessage('...', 'ai');
        const response = await this.ask(text);
        thinkingMsg.textContent = response;
    }

    addMessage(text, role) {
        const container = document.getElementById('alves-chat-msgs');
        const div = document.createElement('div');
        div.className = `msg msg-${role}`;
        div.textContent = text;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return div;
    }

    getSystemPrompt() {
        return `Você é o Assistente Especialista da ALVES ADVOCACIA. 
Sua missão é ajudar visitantes a entender a Reforma Tributária (LC 214/2025).
- Foco em LOCAÇÃO DE EQUIPAMENTOS.
- Use termos como IBS e CBS.
- WhatsApp para dúvidas complexas: https://wa.me/${this.phone}`;
    }

    async ask(userMessage) {
        let apiKey = localStorage.getItem('ALVES_OPENAI_KEY') || localStorage.getItem('ALVES_GEMINI_KEY');
        if (apiKey) apiKey = apiKey.trim();
        
        if (!apiKey) return "IA não configurada. Por favor, insira a chave no Painel Admin.";

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: "system", content: this.getSystemPrompt() },
                        { role: "user", content: userMessage }
                    ]
                })
            });
            const data = await response.json();
            if (data.error) return `Erro: ${data.error.message}`;
            return data.choices[0].message.content;
        } catch (e) { return "Erro de conexão."; }
    }

    async analyzeContract(text) {
        const apiKey = localStorage.getItem('ALVES_OPENAI_KEY');
        if (!apiKey) return "ID_ERRO: Chave não configurada no Painel Admin.";

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey.trim()}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: "Você é o AI Auditor da Alves Advocacia, especialista em Direito Tributário e Locação de Equipamentos (Rental). Sua missão é analisar cláusulas contratuais e identificar riscos frente à Reforma Tributária (IBS/CBS - LC 214/25). Foque em: Cláusulas de preço por dentro, ausência de reequilíbrio, e nomenclatura de tributos extintos. Retorne um resumo estruturado com RISCO ALTO, MÉDIO ou BAIXO para cada ponto encontrado. Seja técnico, mas direto."
                        },
                        {
                            role: "user",
                            content: `Analise as seguintes cláusulas para minha locadora:\n\n${text}`
                        }
                    ],
                    temperature: 0.5
                })
            });

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error("Erro Auditor AI:", error);
            return "Erro ao processar auditoria. Verifique a conexão e a chave de API.";
        }
    }

    updateStatus(active) {
        const dot = document.getElementById('alves-chat-dot');
        if (dot) {
            dot.style.background = active ? '#00ffa3' : '#ff4d4d';
        }
    }
}

// Inicia automaticamente
document.addEventListener('DOMContentLoaded', () => { window.taxAI = new TaxAI(); });
