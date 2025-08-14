import { useState, useCallback, useEffect } from 'react';
import { Sparkles, Languages, Camera, ExternalLink, QrCode, Download, X } from 'lucide-react';

// Função para implementar a lógica de backoff exponencial
const exponentialBackoff = async (func, retries = 5, delay = 1000) => {
  try {
    return await func();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return exponentialBackoff(func, retries - 1, delay * 2);
    }
    throw error;
  }
};

function App() {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isVeo3ModalOpen, setIsVeo3ModalOpen] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageCount, setImageCount] = useState(1);
  const [selectedStyle, setSelectedStyle] = useState('Nenhum');
  const [imageSize, setImageSize] = useState('1:1');
  const [isTranslatedPrompt, setIsTranslatedPrompt] = useState(false);
  const [imagesGenerated, setImagesGenerated] = useState(0);

  const styles = [
    'Nenhum', 'Realista', 'Religioso', 'Terror', 'Romance', 'Ficção',
    'Desenhos para colorir', 'Animes', 'Fantasia', 'Cyberpunk', 'Aquarela'
  ];

  const handleTranslatePrompt = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Por favor, insira um prompt para traduzir.');
      return;
    }
    setLoading(true);
    setError(null);

    const fullPrompt = `Traduza o seguinte texto para inglês, mantendo apenas o texto traduzido: "${prompt}"`;

    try {
      const chatHistory = [{ role: "user", parts: [{ text: fullPrompt }] }];
      const payload = { contents: chatHistory };
      const apiKey = "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

      const response = await exponentialBackoff(() => fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }));

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
        const translatedText = result.candidates[0].content.parts[0].text;
        setPrompt(translatedText.replace(/^"|"$/g, ''));
        setIsTranslatedPrompt(true);
      } else {
        setError("Não foi possível traduzir o prompt.");
      }
    } catch (err) {
      setError('Erro ao traduzir o prompt. Tente novamente mais tarde.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  const handleEnhancePrompt = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Por favor, insira um prompt para melhorar.');
      return;
    }
    setLoading(true);
    setError(null);

    const fullPrompt = `Melhore o seguinte prompt de geração de imagem para torná-lo mais descritivo e detalhado, mantendo apenas o texto melhorado. O prompt é: "${prompt}"`;

    try {
      const chatHistory = [{ role: "user", parts: [{ text: fullPrompt }] }];
      const payload = { contents: chatHistory };
      const apiKey = "";
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

      const response = await exponentialBackoff(() => fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }));

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
        const enhancedText = result.candidates[0].content.parts[0].text;
        setPrompt(enhancedText);
      } else {
        setError("Não foi possível melhorar o prompt.");
      }
    } catch (err) {
      setError('Erro ao melhorar o prompt. Tente novamente mais tarde.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  const handleGenerateImages = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Por favor, insira um prompt.');
      return;
    }
    if (imageCount < 1 || imageCount > 30) {
      setError('O número de imagens deve estar entre 1 e 30.');
      return;
    }
    setLoading(true);
    setImages([]);
    setError(null);
    setImagesGenerated(0);

    const stylePrefix = selectedStyle === 'Nenhum' ? '' : `in the style of ${selectedStyle}. `;
    const sizeDescription = imageSize === '16:9' ? 'a photo in a cinematic, widescreen aspect ratio. ' : imageSize === '9:16' ? 'a photo in a vertical, portrait aspect ratio. ' : 'a photo in a square aspect ratio. ';
    const finalPrompt = stylePrefix + sizeDescription + prompt;

    const allImages = [];
    const batchSize = 4; // Lote de imagens por requisição
    const numBatches = Math.ceil(imageCount / batchSize);

    for (let i = 0; i < numBatches; i++) {
      const currentBatchSize = Math.min(batchSize, imageCount - allImages.length);
      try {
        const payload = { instances: { prompt: finalPrompt }, parameters: { sampleCount: currentBatchSize } };
        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

        const response = await exponentialBackoff(() => fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }));

        const result = await response.json();

        if (result.predictions && result.predictions.length > 0) {
          const newImages = result.predictions.map(prediction => `data:image/png;base64,${prediction.bytesBase64Encoded}`);
          allImages.push(...newImages);
          setImages(allImages);
          setImagesGenerated(allImages.length);
        } else {
          setError('Não foi possível gerar imagens neste lote. Tentando o próximo...');
        }
      } catch (err) {
        setError(`Erro ao gerar lote de imagens: ${err.message}.`);
        console.error(err);
        break; // Interrompe a geração se ocorrer um erro
      }
    }

    setLoading(false);
  }, [prompt, imageCount, selectedStyle, imageSize]);

  const handleVeo3Click = () => {
    setIsVeo3ModalOpen(true);
  };

  const openVeo3Link = () => {
    window.open('https://opal.withgoogle.com/?flow=drive:/1M1RZ5CqMRsP2Ys6JArbYZt0WyUq6AbnE&mode=app&shared=true', '_blank', 'noopener,noreferrer');
    setIsVeo3ModalOpen(false);
  };

  const handleCopyPix = () => {
    try {
      navigator.clipboard.writeText('84996096315');
    } catch (err) {
      // Fallback para navegadores antigos
      const textarea = document.createElement('textarea');
      textarea.value = '84996096315';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setIsPixModalOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerateImages();
    }
  };

  const openImageViewer = (imageSrc) => {
    setSelectedImage(imageSrc);
    setIsImageViewerOpen(true);
  };

  const closeImageViewer = () => {
    setSelectedImage(null);
    setIsImageViewerOpen(false);
  };

  const handleDownloadImage = () => {
    if (selectedImage) {
      const link = document.createElement('a');
      link.href = selectedImage;
      link.download = 'tm-arte-virtual.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    if (isTranslatedPrompt) {
      setIsTranslatedPrompt(false);
    }
  }, [prompt]);

  return (
    <div className="bg-slate-900 min-h-screen text-slate-100 font-inter flex flex-col items-center p-4 md:p-8">
      {/* Veo3 Modal */}
      {isVeo3ModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-lg w-full text-center border border-slate-700">
            <h3 className="text-xl font-bold mb-4">Aviso Importante</h3>
            <p className="text-lg mb-6">
              Para usar o Veo3, você precisa de uma VPN com um IP localizado nos Estados Unidos.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setIsVeo3ModalOpen(false)}
                className="px-6 py-3 bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={openVeo3Link}
                className="px-6 py-3 bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors font-semibold"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIX Copy Modal */}
      {isPixModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-lg w-full text-center border border-slate-700">
            <h3 className="text-xl font-bold mb-4">Sucesso!</h3>
            <p className="text-lg mb-6">
              A chave PIX foi copiada para a área de transferência. Muito obrigado pela sua ajuda!
            </p>
            <button
              onClick={() => setIsPixModalOpen(false)}
              className="px-6 py-3 bg-teal-500 hover:bg-teal-600 rounded-lg transition-colors font-semibold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {isImageViewerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closeImageViewer}
              className="absolute top-4 right-4 bg-slate-700 text-white rounded-full p-2 hover:bg-red-500 transition-colors"
            >
              <X size={24} />
            </button>
            <img src={selectedImage} alt="Imagem gerada" className="max-w-full max-h-[80vh] rounded-lg shadow-xl" />
            <button
              onClick={handleDownloadImage}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 py-2 px-4 bg-teal-500 text-white rounded-full shadow-lg hover:bg-teal-600 transition-colors"
            >
              <Download size={20} />
              Download
            </button>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <header className="w-full flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <img
            src="https://ia801701.us.archive.org/17/items/logo-tem/logo%20TEM.png"
            alt="Logo T&M Arte Virtual"
            className="rounded-lg h-10"
          />
          <h1 className="text-4xl font-extrabold text-white tracking-wider">
            <span className="text-teal-400">T&M</span> Arte Virtual
          </h1>
        </div>
        <button
          onClick={handleVeo3Click}
          className="bg-slate-700 text-slate-200 hover:bg-teal-500 transition-colors duration-300 py-2 px-4 rounded-full flex items-center gap-2 font-semibold shadow-lg"
        >
          <ExternalLink size={20} />
          <span>Veo3</span>
        </button>
      </header>

      <main className="w-full max-w-7xl flex flex-col lg:flex-row gap-8">
        {/* Painel de Controle (Input e Opções) */}
        <aside className="w-full lg:w-1/3 bg-slate-800 p-6 rounded-3xl shadow-xl border border-slate-700 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="prompt" className="text-lg font-semibold text-slate-300">Seu Prompt</label>
            <textarea
              id="prompt"
              rows="4"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-slate-700 text-slate-100 p-4 rounded-xl border border-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none"
              placeholder="Descreva a imagem que você deseja gerar..."
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <button
                onClick={handleTranslatePrompt}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-600 hover:bg-slate-500 transition-all rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Languages size={18} />
                Traduzir Prompt
              </button>
              <button
                onClick={handleEnhancePrompt}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-slate-600 hover:bg-slate-500 transition-all rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={18} />
                Melhorar Prompt
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <label htmlFor="styles" className="text-lg font-semibold text-slate-300">Estilos</label>
            <div className="flex flex-wrap gap-2">
              {styles.map(style => (
                <button
                  key={style}
                  onClick={() => setSelectedStyle(style)}
                  className={`py-2 px-4 rounded-full text-sm font-medium transition-all ${
                    selectedStyle === style
                      ? 'bg-teal-500 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-teal-700'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
