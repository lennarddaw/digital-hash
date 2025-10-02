import { pipeline } from '@xenova/transformers'

let embeddingModel = null
let sentimentModel = null

export async function loadModels() {
  if (!embeddingModel) {
    embeddingModel = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    )
  }
  
  if (!sentimentModel) {
    sentimentModel = await pipeline(
      'sentiment-analysis',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
    )
  }
  
  return { embeddingModel, sentimentModel }
}

export function getModels() {
  return { embeddingModel, sentimentModel }
}