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

async function main() {
  console.log("Conectando...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start();

  console.log("✅ Conectado! O bot está rodando e vai repostar a cada 30 segundos.");
  console.log(`📡 Configurado para ${channelPairs.length} pares de canais:`);
  channelPairs.forEach((pair, index) => {
    console.log(`   Par ${index + 1}: ${pair.source} → ${pair.destination}`);
  });

  // Inicia o processo de repostagem para todos os pares
  setInterval(async () => {
    await processAllChannelPairs(client);
  }, 5 * 60 * 1000); // 30 segundos (ajuste se quiser mais tempo)
}

async function processAllChannelPairs(client) {
  console.log("🔄 Processando todos os pares de canais...");
  
  // Processa cada par de canais em paralelo
  const promises = channelPairs.map((pair, index) => 
    repostNextMedia(client, pair, index + 1)
  );
  
  await Promise.allSettled(promises);
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
      console.log(`⚠️ Par ${pairNumber}: ForwardMessages falhou, tentando fallback...`);

      try {
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
        console.error(`❌ Par ${pairNumber}: Falha total:`, sendError.message);
        throw sendError;
      }
    }

    fs.writeFileSync(channelPair.lastMessageFile, message.id.toString());

  } catch (error) {
    console.error(`❌ Par ${pairNumber}: Erro no repost:`, error.message);
  }
}

main();
