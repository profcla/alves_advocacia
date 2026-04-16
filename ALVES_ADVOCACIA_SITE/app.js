// Logic for Tax Reform Simulator - Locação de Equipamentos
document.addEventListener('DOMContentLoaded', () => {
    const revenueInput = document.getElementById('faturamento');
    const vendaInput = document.getElementById('venda');
    const cbsInput = document.getElementById('cbs-rate');
    const ibsInput = document.getElementById('ibs-rate');
    const marginInput = document.getElementById('margem');
    const marginVal = document.getElementById('margem-val');
    const comprasDisplay = document.getElementById('compras-display');
    const analyzeBtn = document.getElementById('analyzeBtn');
    
    let chart = null;

    function updateCalculations() {
        const rental = parseFloat(revenueInput.value) || 0;
        const sales = parseFloat(vendaInput.value) || 0;
        const totalRevenue = rental + sales;

        const cbsRate = (parseFloat(cbsInput.value) || 0) / 100;
        const ibsRate = (parseFloat(ibsInput.value) || 0) / 100;
        const ibsCbsRate = cbsRate + ibsRate;
        
        const margin = parseFloat(marginInput.value) || 0;
        const costs = totalRevenue * (1 - (margin / 100));
        
        // Update display
        marginVal.textContent = `${margin}%`;
        comprasDisplay.value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(costs);

        // 1. Simples Nacional Puro
        // Rental - Anexo III (sem ISS)
        let rateAnexo3 = 0.06;
        if (rental * 12 > 180000) rateAnexo3 = 0.112; 
        const taxRentalPuro = rental * rateAnexo3 * 0.67;

        // Sales - Anexo I (Comércio)
        let rateAnexo1 = 0.04;
        if (sales * 12 > 180000) rateAnexo1 = 0.073;
        const taxSalesPuro = sales * rateAnexo1;
        const taxPuro = taxRentalPuro + taxSalesPuro;

        // 2. Simples Nacional Híbrido
        const ibsCbsCredit = costs * ibsCbsRate;
        const netIbsCbs = Math.max(0, (totalRevenue * ibsCbsRate) - ibsCbsCredit);
        const dasReduzido = (taxRentalPuro + taxSalesPuro) * 0.35; 
        const taxHibrido = netIbsCbs + dasReduzido;

        // 3. Lucro Presumido (Reforma)
        const netIbsCbsPresumido = Math.max(0, (totalRevenue * ibsCbsRate) - ibsCbsCredit);
        const irpj_csllRental = rental * 0.32 * 0.24; // 32% base * 24% (15+9)
        const irpj_csllSales = (sales * 0.08 * 0.15) + (sales * 0.12 * 0.09); // 8% IRPJ + 12% CSLL
        const taxPresumido = netIbsCbsPresumido + irpj_csllRental + irpj_csllSales;

        // 4. Lucro Real
        const lucro = totalRevenue - costs;
        const pisCofinsReal = (totalRevenue * 0.0925) - (costs * 0.0925);
        const irpjCsllReal = lucro > 0 ? (lucro * 0.34) : 0;
        const taxReal = Math.max(0, pisCofinsReal) + irpjCsllReal;

        // Créditos B2B
        const creditPuro = (rental * rateAnexo3 * 0.4) + (sales * rateAnexo1 * 0.4);
        const creditFull = totalRevenue * ibsCbsRate;

        renderResults({
            puro: taxPuro,
            hibrido: taxHibrido,
            presumido: taxPresumido,
            real: taxReal,
            credits: {
                puro: creditPuro,
                hibrido: creditFull,
                presumido: creditFull,
                real: creditFull
            }
        });

        renderBreakdown({
            rental, sales, costs, 
            taxRentalPuro, taxSalesPuro, 
            taxHibrido, taxPresumido, taxReal,
            irpj_csllRental, irpj_csllSales, netIbsCbs
        });
    }

    function renderBreakdown(d) {
        const container = document.getElementById('detailed-breakdown');
        
        const ibsCbsPuro = (d.taxRentalPuro + d.taxSalesPuro) * 0.4;
        const outrosPuro = (d.taxRentalPuro + d.taxSalesPuro) * 0.6;

        container.innerHTML = `
            <div class="breakdown-item">
                <h4>Simples Nacional <span class="badge">Puro</span></h4>
                <div class="math-row"><span>DAS Total (Regra Atual)</span><span>${formatCurrency(d.taxRentalPuro + d.taxSalesPuro)}</span></div>
                <div class="math-row"><span>↳ Parcela IBS/CBS (Por Dentro)</span><span>${formatCurrency(ibsCbsPuro)}</span></div>
                <div class="math-row"><span>↳ Outros (IR/CS/CPP)</span><span>${formatCurrency(outrosPuro)}</span></div>
                <div class="math-total"><span>Crédito p/ Cliente B2B</span><span>${formatCurrency(ibsCbsPuro)}</span></div>
            </div>
            <div class="breakdown-item">
                <h4>Simples Nacional <span class="badge">Híbrido</span></h4>
                <div class="math-row"><span>IBS/CBS (Fora do Simples)</span><span>${formatCurrency(d.netIbsCbs)}</span></div>
                <div class="math-row"><span>DAS Reduzido (IR/CS/CPP)</span><span>${formatCurrency(d.dasReduzido)}</span></div>
                <div class="math-total"><span>Carga Total Consolidada</span><span>${formatCurrency(d.taxHibrido)}</span></div>
            </div>
            <div class="breakdown-item">
                <h4>Lucro Presumido <span class="badge">Reforma</span></h4>
                <div class="math-row"><span>IBS/CBS (Líquido de Créditos)</span><span>${formatCurrency(d.netIbsCbs)}</span></div>
                <div class="math-row"><span>IRPJ/CSLL (Bases 32% e 8/12%)</span><span>${formatCurrency(d.irpj_csllRental + d.irpj_csllSales)}</span></div>
                <div class="math-total"><span>Carga Total Consolidada</span><span>${formatCurrency(d.taxPresumido)}</span></div>
            </div>
            <div class="breakdown-item">
                <h4>Lucro Real <span class="badge">Margem</span></h4>
                <div class="math-row"><span>Receita - Custos (Lucro)</span><span>${formatCurrency(d.totalRevenue - d.costs)}</span></div>
                <div class="math-row"><span>PIS/COFINS (Não-Cumulativo)</span><span>${formatCurrency(d.pisCofinsReal)}</span></div>
                <div class="math-row"><span>IRPJ/CSLL (34% s/ Lucro)</span><span>${formatCurrency(d.irpjCsllReal)}</span></div>
                <div class="math-total"><span>Carga Total Consolidada</span><span>${formatCurrency(d.taxReal)}</span></div>
            </div>
        `;
    }

    // EXPORTAR PDF (NOVO RELATÓRIO EXECUTIVO)
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    exportPdfBtn.addEventListener('click', () => {
        const template = document.getElementById('pdf-template');
        const companyName = document.getElementById('companyName').value || 'Sua Empresa Locadora';
        
        // Preparar Template
        template.style.display = 'block';
        document.getElementById('pdf-company-title').textContent = `ANÁLISE ESTRATÉGICA: ${companyName.toUpperCase()}`;
        document.getElementById('pdf-date').textContent = `Data: ${new Date().toLocaleDateString('pt-BR')}`;
        
        // Resumo Executivo Dinâmico
        const rentalVal = parseFloat(revenueInput.value) || 0;
        const salesVal = parseFloat(vendaInput.value) || 0;
        document.getElementById('pdf-summary').innerHTML = `
            Análise baseada em faturamento mensal de <strong>${formatCurrency(rentalVal)} (Locação)</strong> 
            e <strong>${formatCurrency(salesVal)} (Renovação de Frota)</strong>. 
            Comparativo foca na transição para o modelo de não-cumulatividade plena (IBS/CBS).
        `;

        // Preencher Tabela
        const regimes = [
            { name: 'Simples Puro', tax: parseFloat(document.getElementById('tax-puro').textContent.replace(/[^\d,]/g, '').replace(',', '.')) },
            { name: 'Simples Híbrido', tax: parseFloat(document.getElementById('tax-hibrido').textContent.replace(/[^\d,]/g, '').replace(',', '.')) },
            { name: 'Lucro Presumido', tax: parseFloat(document.getElementById('tax-presumido').textContent.replace(/[^\d,]/g, '').replace(',', '.')) },
            { name: 'Lucro Real', tax: parseFloat(document.getElementById('tax-real').textContent.replace(/[^\d,]/g, '').replace(',', '.')) }
        ];

        const tableBody = document.getElementById('pdf-table-body');
        tableBody.innerHTML = regimes.map(r => `
            <tr>
                <td>${r.name}</td>
                <td>${formatCurrency(r.tax)}</td>
                <td>${((r.tax / (rentalVal + salesVal)) * 100).toFixed(2)}%</td>
                <td>Sim</td>
            </tr>
        `).join('');

        // Transferir Gráfico (Como Imagem)
        document.getElementById('pdf-chart-img').src = chart.toBase64Image();

        // Transferir Riscos
        const risks = document.getElementById('riskList').cloneNode(true);
        document.getElementById('pdf-risks').innerHTML = risks.innerHTML;

        const opt = {
            margin:       [10, 10],
            filename:     `Relatorio_${companyName.replace(/\s+/g, '_')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        exportPdfBtn.textContent = "⏳ Gerando...";
        html2pdf().set(opt).from(template).save().then(() => {
            template.style.display = 'none';
            exportPdfBtn.textContent = "📄 Baixar Relatório PDF";
        });
    });

    function renderResults(data) {
        document.getElementById('tax-puro').textContent = formatCurrency(data.puro);
        document.getElementById('tax-hibrido').textContent = formatCurrency(data.hibrido);
        document.getElementById('tax-presumido').textContent = formatCurrency(data.presumido);
        document.getElementById('tax-real').textContent = formatCurrency(data.real);

        // Update Client Credits
        const cards = document.querySelectorAll('.regime-card');
        const keys = ['puro', 'hibrido', 'presumido', 'real'];
        keys.forEach((key, i) => {
            let creditEl = cards[i].querySelector('.client-credit');
            if (!creditEl) {
                creditEl = document.createElement('div');
                creditEl.className = 'client-credit';
                cards[i].appendChild(creditEl);
            }
            creditEl.innerHTML = `Crédito Gerado: <strong>${formatCurrency(data.credits[key])}</strong>`;
        });

        updateChart(data);
    }

    function formatCurrency(val) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    }

    function updateChart(data) {
        const ctx = document.getElementById('comparisonChart').getContext('2d');
        
        if (chart) chart.destroy();

        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Simples Puro', 'Simples Híbrido', 'Presumido', 'Lucro Real'],
                datasets: [{
                    label: 'Carga Tributária Mensal (R$)',
                    data: [data.puro, data.hibrido, data.presumido, data.real],
                    backgroundColor: [
                        'rgba(148, 163, 184, 0.4)',
                        'rgba(0, 229, 255, 0.6)',
                        'rgba(148, 163, 184, 0.4)',
                        'rgba(148, 163, 184, 0.4)'
                    ],
                    borderColor: [
                        '#94a3b8',
                        '#00e5ff',
                        '#94a3b8',
                        '#94a3b8'
                    ],
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        ticks: { color: '#94a3b8' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    // CONFIGURAÇÕES DE DOCUMENTOS
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const fileInput = document.getElementById('fileInput');
    const fileNameSpan = document.getElementById('fileName');
    const contractTextArea = document.getElementById('contractText');

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        fileNameSpan.textContent = `Lendo: ${file.name}...`;
        const reader = new FileReader();

        reader.onload = async (event) => {
            const arrayBuffer = event.target.result;
            let extractedText = "";

            try {
                if (file.name.endsWith('.pdf')) {
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        extractedText += textContent.items.map(item => item.str).join(' ') + "\n";
                    }
                } else if (file.name.endsWith('.docx')) {
                    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                    extractedText = result.value;
                } else if (file.name.endsWith('.doc')) {
                    alert("Aviso: O suporte para .doc antigo é limitado. Por favor, salve como .docx para melhores resultados.");
                    fileNameSpan.textContent = "Erro: Use .docx";
                    return;
                }

                contractTextArea.value = extractedText;
                fileNameSpan.textContent = `Arquivo carregado: ${file.name}`;
            } catch (error) {
                console.error(error);
                alert("Erro ao ler o documento. Verifique se o arquivo não está corrompido.");
                fileNameSpan.textContent = "Erro na leitura";
            }
        };

        reader.readAsArrayBuffer(file);
    });

    // CLEAR BUTTON LOGIC
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            contractTextArea.value = '';
            fileInput.value = '';
            fileNameSpan.textContent = "Nenhum arquivo selecionado";
            document.getElementById('riskList').innerHTML = '';
            document.getElementById('analyzerResults').classList.add('hidden');
        });
    }

    // ANALYZER LOGIC (OPENAI VERSION)
    analyzeBtn.addEventListener('click', async () => {
        const text = contractTextArea.value.trim();
        if (!text) {
            alert("Por favor, cole um texto ou carregue um arquivo para análise.");
            return;
        }

        const riskList = document.getElementById('riskList');
        const resultsDiv = document.getElementById('analyzerResults');
        
        // Estado de Carregamento
        const originalText = analyzeBtn.innerHTML;
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = "⏳ Analisando com RentalAI...";
        
        riskList.innerHTML = '<div class="loading-spinner">Auditoria Jurídica em andamento...</div>';
        resultsDiv.classList.remove('hidden');

        try {
            // Chamada ao novo método no tax-ai.js
            const result = await window.taxAI.analyzeContract(text);
            
            // Tratamento de Erro de Chave
            if (result.includes("ID_ERRO")) {
                riskList.innerHTML = `<p style="color: #ef4444; padding: 1rem;">${result.replace('ID_ERRO: ', '')}</p>`;
            } else {
                // Formatação simples de Markdown para HTML
                const formattedResult = result
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br>');
                
                riskList.innerHTML = `<div class="ai-response">${formattedResult}</div>`;
            }
        } catch (error) {
            riskList.innerHTML = '<p style="color: #ef4444;">Erro na conexão com a RentalAI. Tente novamente.</p>';
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = originalText;
            resultsDiv.scrollIntoView({ behavior: 'smooth' });
        }
    });

    // Listeners
    revenueInput.addEventListener('input', updateCalculations);
    vendaInput.addEventListener('input', updateCalculations);
    cbsInput.addEventListener('input', updateCalculations);
    ibsInput.addEventListener('input', updateCalculations);
    marginInput.addEventListener('input', updateCalculations);

    // Initial run
    updateCalculations();
});
