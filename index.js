const { Api, TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');

// Substitua com suas credenciais
const apiId = 28954082; // Seu api_id
const apiHash = '8644e104f56f78dcb35d26e76aa78387'; // Seu api_hash

// Usa a StringSession que você vai salvar no Railway
const stringSession = new StringSession(process.env.STRING_SESSION);

// Configuração dos 4 pares de canais
const channelPairs = [
  {
    source: parseInt(process.env.SOURCE_CHANNEL_1),
    destination: parseInt(process.env.DESTINATION_CHANNEL_1),
    lastMessageFile: 'last_message_id_pair_1.txt'
  },
  {
    source: parseInt(process.env.SOURCE_CHANNEL_2),
    destination: parseInt(process.env.DESTINATION_CHANNEL_2),
    lastMessageFile: 'last_message_id_pair_2.txt'
  },
  {
    source: parseInt(process.env.SOURCE_CHANNEL_3),
    destination: parseInt(process.env.DESTINATION_CHANNEL_3),
    lastMessageFile: 'last_message_id_pair_3.txt'
  },
  {
    source: parseInt(process.env.SOURCE_CHANNEL_4),
    destination: parseInt(process.env.DESTINATION_CHANNEL_4),
    lastMessageFile: 'last_message_id_pair_4.txt'
  }
];

// Configurações de rate limiting
const DELAY_BETWEEN_PAIRS = 10000; // 10 segundos entre cada par
const DELAY_BETWEEN_REQUESTS = 3000; // 3 segundos entre requisições
const INTERVAL_MINUTES = 10; // 10 minutos entre execuções (aumentado de 5)

// Função auxiliar para delay
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função para tratar erros de FLOOD_WAIT do Telegram
function handleFloodWait(error) {
  const errorMessage = error.message || error.toString();
  const floodMatch = errorMessage.match(/FLOOD_WAIT_(\d+)/);
  
  if (floodMatch) {
    const waitSeconds = parseInt(floodMatch[1]);
    console.log(`⏳ Rate limit detectado! Aguardando ${waitSeconds} segundos...`);
    return waitSeconds * 1000; // Retorna em milissegundos
  }
  
  return null;
}

async function main() {
  console.log("Conectando...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start();

  console.log(`✅ Conectado! O bot está rodando e vai repostar a cada ${INTERVAL_MINUTES} minutos.`);
  console.log(`📡 Configurado para ${channelPairs.length} pares de canais:`);
  channelPairs.forEach((pair, index) => {
    console.log(`   Par ${index + 1}: ${pair.source} → ${pair.destination}`);
  });

  // Executa uma vez imediatamente
  await processAllChannelPairs(client);

  // Inicia o processo de repostagem para todos os pares
  setInterval(async () => {
    await processAllChannelPairs(client);
  }, INTERVAL_MINUTES * 60 * 1000);
}

async function processAllChannelPairs(client) {
  console.log("🔄 Processando todos os pares de canais...");
  
  // Processa cada par de canais SEQUENCIALMENTE com delay entre eles
  for (let i = 0; i < channelPairs.length; i++) {
    const pair = channelPairs[i];
    const pairNumber = i + 1;
    
    try {
      await repostNextMedia(client, pair, pairNumber);
      
      // Delay entre pares (exceto após o último)
      if (i < channelPairs.length - 1) {
        console.log(`⏸️ Aguardando ${DELAY_BETWEEN_PAIRS / 1000} segundos antes do próximo par...`);
        await sleep(DELAY_BETWEEN_PAIRS);
      }
    } catch (error) {
      console.error(`❌ Erro ao processar par ${pairNumber}:`, error.message);
      // Continua para o próximo par mesmo se houver erro
    }
  }
  
  console.log("✅ Processamento de todos os pares concluído.");
}

async function repostNextMedia(client, channelPair, pairNumber) {
  try {
    let lastProcessedId = 999999999;
    if (fs.existsSync(channelPair.lastMessageFile)) {
      const fileContent = fs.readFileSync(channelPair.lastMessageFile, 'utf8');
      if (fileContent) {
        lastProcessedId = parseInt(fileContent);
      }
    }

    // Delay antes de buscar mensagens
    await sleep(DELAY_BETWEEN_REQUESTS);

    const messages = await client.getMessages(channelPair.source, {
      limit: 1,
      maxId: lastProcessedId - 1
    });

    if (messages.length === 0) {
      console.log(`📭 Par ${pairNumber}: Não há mais mídias para repostar.`);
      return;
    }

    const message = messages[0];
    const media = message.media;
    const caption = message.message;
    const entities = message.entities || [];

    if (!media) {
      console.log(`📝 Par ${pairNumber}: Mensagem sem mídia, pulando...`);
      fs.writeFileSync(channelPair.lastMessageFile, message.id.toString());
      return;
    }

    console.log(`📤 Par ${pairNumber}: Repostando mídia ID ${message.id} de ${channelPair.source} para ${channelPair.destination}...`);

    // Delay antes de enviar
    await sleep(DELAY_BETWEEN_REQUESTS);

    // Tenta copiar a mensagem com formatação
    try {
      await client.invoke(new Api.messages.ForwardMessages({
        fromPeer: channelPair.source,
        id: [message.id],
        toPeer: channelPair.destination,
        dropAuthor: false,
        dropMediaCaptions: false,
        silent: false,
      }));
      console.log(`✅ Par ${pairNumber}: Mídia copiada com sucesso!`);
    } catch (copyError) {
      // Verifica se é FLOOD_WAIT
      const floodWaitTime = handleFloodWait(copyError);
      if (floodWaitTime) {
        await sleep(floodWaitTime);
        // Tenta novamente após o wait
        try {
          await client.invoke(new Api.messages.ForwardMessages({
            fromPeer: channelPair.source,
            id: [message.id],
            toPeer: channelPair.destination,
            dropAuthor: false,
            dropMediaCaptions: false,
            silent: false,
          }));
          console.log(`✅ Par ${pairNumber}: Mídia copiada com sucesso após wait!`);
        } catch (retryError) {
          console.log(`⚠️ Par ${pairNumber}: ForwardMessages falhou novamente, tentando fallback...`);
          await tryFallbackSend(client, channelPair, pairNumber, media, caption, entities);
        }
      } else {
        console.log(`⚠️ Par ${pairNumber}: ForwardMessages falhou, tentando fallback...`);
        await tryFallbackSend(client, channelPair, pairNumber, media, caption, entities);
      }
    }

    fs.writeFileSync(channelPair.lastMessageFile, message.id.toString());

  } catch (error) {
    // Verifica se é FLOOD_WAIT
    const floodWaitTime = handleFloodWait(error);
    if (floodWaitTime) {
      console.log(`⏳ Par ${pairNumber}: Rate limit detectado, aguardando...`);
      await sleep(floodWaitTime);
    } else {
      console.error(`❌ Par ${pairNumber}: Erro no repost:`, error.message);
    }
  }
}

async function tryFallbackSend(client, channelPair, pairNumber, media, caption, entities) {
  try {
    // Delay antes do fallback
    await sleep(DELAY_BETWEEN_REQUESTS);

    const messageParams = {
      file: media,
      message: caption || ""
    };

    if (entities && entities.length > 0) {
      messageParams.entities = entities;
    }

    await client.sendMessage(channelPair.destination, messageParams);
    console.log(`✅ Par ${pairNumber}: Mídia enviada via sendMessage!`);
  } catch (sendError) {
    // Verifica se é FLOOD_WAIT
    const floodWaitTime = handleFloodWait(sendError);
    if (floodWaitTime) {
      console.log(`⏳ Par ${pairNumber}: Rate limit no fallback, aguardando ${floodWaitTime / 1000} segundos...`);
      await sleep(floodWaitTime);
      // Tenta novamente após o wait
      try {
        const messageParams = {
          file: media,
          message: caption || ""
        };

        if (entities && entities.length > 0) {
          messageParams.entities = entities;
        }

        await client.sendMessage(channelPair.destination, messageParams);
        console.log(`✅ Par ${pairNumber}: Mídia enviada via sendMessage após wait!`);
      } catch (retryError) {
        console.error(`❌ Par ${pairNumber}: Falha total no fallback:`, retryError.message);
        throw retryError;
      }
    } else {
      console.error(`❌ Par ${pairNumber}: Falha total:`, sendError.message);
      throw sendError;
    }
  }
}

main();
