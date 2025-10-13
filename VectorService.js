const VectorService = (({ geminiApiKey, embeddingModel }) => {

  if (!geminiApiKey) {
    throw new Error('Gemini API key not found. Please provide it in the main function arguments.');
  }

  if (!embeddingModel) {
    throw new Error('Embedding model not found. Please provide it in the main function arguments.');
  }

  const model = embeddingModel;
  const embeddingUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${geminiApiKey}`;

  const chunkText = ({ text, maxChunkSize = 1000, overlap = 100 }) => {
    if (!text) {
      return [];
    }

    const chunks = [];
    const lines = text.split('\n');
    let currentChunk = '';
    let previousChunk = '';

    for (const line of lines) {
      // Check for Markdown headers
      if (line.match(/^#+\s/)) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          previousChunk = currentChunk.trim();
          currentChunk = '';
        }
      }

      // Add line to current chunk
      currentChunk += line + '\n';

      // If current chunk exceeds maxChunkSize, create a new chunk
      if (currentChunk.length > maxChunkSize) {
        // Try to find a natural split point (e.g., end of a sentence or paragraph)
        let splitPoint = currentChunk.lastIndexOf('\n\n'); // Paragraph
        if (splitPoint === -1) {
          splitPoint = currentChunk.lastIndexOf('. '); // Sentence
        }
        if (splitPoint === -1) {
          splitPoint = currentChunk.lastIndexOf('\n'); // Line break
        }

        if (splitPoint !== -1 && splitPoint > currentChunk.length - maxChunkSize) {
          chunks.push(currentChunk.substring(0, splitPoint + 1).trim());
          previousChunk = currentChunk.substring(0, splitPoint + 1).trim();
          currentChunk = currentChunk.substring(splitPoint + 1);
        } else {
          // If no natural split point found, just split at maxChunkSize
          chunks.push(currentChunk.substring(0, maxChunkSize).trim());
          previousChunk = currentChunk.substring(0, maxChunkSize).trim();
          currentChunk = currentChunk.substring(maxChunkSize);
        }

        // Add overlap
        if (overlap > 0 && previousChunk.length > 0) {
          const overlapText = previousChunk.substring(Math.max(0, previousChunk.length - overlap));
          currentChunk = overlapText + currentChunk;
        }
      }
    }

    // Add any remaining text as a chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  };

  const createEmbeddings = (chunks) => {
    const requests = chunks.map(chunk => ({
      model: `models/${model}`,
      content: {
        parts: [{ text: chunk }]
      }
    }));

    const response = UrlFetchApp.fetch(embeddingUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ requests })
    });

    const embeddings = JSON.parse(response.getContentText()).embeddings;
    return embeddings.map(e => e.values);
  };

  const saveToVectorDB = (data) => {
    // TODO: Implement the call to your MongoDB Data API using UrlFetchApp.
    console.log('Saving data to vector DB:', data);
  };

  const processAndStoreText = (text) => {
    const chunks = chunkText({ text });
    const embeddings = createEmbeddings(chunks);

    const dataToStore = chunks.map((chunk, index) => ({
      text: chunk,
      embedding: embeddings[index], // Assuming the order is the same
    }));

    saveToVectorDB(dataToStore);
  };

  return {
    chunkText,
    createEmbeddings,
    saveToVectorDB,
    processAndStoreText,
  };
});