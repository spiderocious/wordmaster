import { WordModel } from '@models';
import { logger } from '@utils';

/**
 * Migration: Add common aliases for countries with official names
 * This allows users to type "Tanzania" instead of "Tanzania, United Republic of"
 */
export async function up(): Promise<void> {
  logger.info('Starting migration: Add country aliases');

  const aliases = [
    { word: 'bahamas (the)', alias: 'bahamas' },
    { word: 'bolivia (plurinational state of)', alias: 'bolivia' },
    { word: 'bonaire, sint eustatius and saba', alias: 'bonaire' },
    { word: 'british indian ocean territory (the)', alias: 'british indian ocean territory' },
    { word: 'cayman islands (the)', alias: 'cayman islands' },
    { word: 'central african republic (the)', alias: 'central african republic' },
    { word: 'cocos (keeling) islands (the)', alias: 'cocos islands' },
    { word: 'comoros (the)', alias: 'comoros' },
    { word: 'congo (the democratic republic of the)', alias: 'congo' },
    { word: 'congo (the)', alias: 'congo' },
    { word: 'cook islands (the)', alias: 'cook islands' },
    { word: 'dominican republic (the)', alias: 'dominican republic' },
    { word: 'falkland islands (the) [malvinas]', alias: 'falkland islands' },
    { word: 'faroe islands (the)', alias: 'faroe islands' },
    { word: 'french southern territories (the)', alias: 'french southern territories' },
    { word: 'gambia (the)', alias: 'gambia' },
    { word: 'holy see (the)', alias: 'vatican' },
    { word: 'holy see (the)', alias: 'holy see' },
    { word: 'iran (islamic republic of)', alias: 'iran' },
    { word: "korea (the democratic people's republic of)", alias: 'north korea' },
    { word: 'korea (the republic of)', alias: 'south korea' },
    { word: 'korea (the republic of)', alias: 'korea' },
    { word: "lao people's democratic republic (the)", alias: 'laos' },
    { word: 'marshall islands (the)', alias: 'marshall islands' },
    { word: 'micronesia (federated states of)', alias: 'micronesia' },
    { word: 'moldova (the republic of)', alias: 'moldova' },
    { word: 'netherlands (the)', alias: 'netherlands' },
    { word: 'niger (the)', alias: 'niger' },
    { word: 'northern mariana islands (the)', alias: 'northern mariana islands' },
    { word: 'palestine, state of', alias: 'palestine' },
    { word: 'philippines (the)', alias: 'philippines' },
    { word: 'russian federation (the)', alias: 'russia' },
    { word: 'saint helena, ascension and tristan da cunha', alias: 'saint helena' },
    { word: 'saint martin (french part)', alias: 'saint martin' },
    { word: 'sint maarten (dutch part)', alias: 'sint maarten' },
    { word: 'sudan (the)', alias: 'sudan' },
    { word: 'tanzania, united republic of', alias: 'tanzania' },
    { word: 'turks and caicos islands (the)', alias: 'turks and caicos islands' },
    { word: 'united arab emirates (the)', alias: 'uae' },
    { word: 'united arab emirates (the)', alias: 'united arab emirates' },
    { word: 'united kingdom of great britain and northern ireland (the)', alias: 'uk' },
    { word: 'united kingdom of great britain and northern ireland (the)', alias: 'united kingdom' },
    { word: 'united states minor outlying islands (the)', alias: 'united states minor outlying islands' },
    { word: 'united states of america (the)', alias: 'usa' },
    { word: 'united states of america (the)', alias: 'united states' },
    { word: 'venezuela (bolivarian republic of)', alias: 'venezuela' },
    { word: 'virgin islands (british)', alias: 'british virgin islands' },
    { word: 'virgin islands (u.s.)', alias: 'us virgin islands' },
  ];

  let updated = 0;
  let errors = 0;

  for (const { word, alias } of aliases) {
    try {
      const result = await WordModel.updateOne(
        { word: word, category: 'country' },
        { $addToSet: { aliases: alias } }
      );

      if (result.modifiedCount > 0) {
        updated++;
        logger.debug(`Added alias "${alias}" to "${word}"`);
      }
    } catch (error: any) {
      errors++;
      logger.error(`Error adding alias "${alias}" to "${word}"`, error);
    }
  }

  logger.info(`Migration complete: ${updated} updated, ${errors} errors`);
}

/**
 * Rollback migration: Remove country aliases
 */
export async function down(): Promise<void> {
  logger.info('Rolling back migration: Remove country aliases');

  const aliases = [
    'bahamas', 'bolivia', 'bonaire', 'british indian ocean territory',
    'cayman islands', 'central african republic', 'cocos islands',
    'comoros', 'congo', 'cook islands', 'dominican republic',
    'falkland islands', 'faroe islands', 'french southern territories',
    'gambia', 'vatican', 'holy see', 'iran', 'north korea', 'south korea',
    'korea', 'laos', 'marshall islands', 'micronesia', 'moldova',
    'netherlands', 'niger', 'northern mariana islands', 'palestine',
    'philippines', 'russia', 'saint helena', 'saint martin', 'sint maarten',
    'sudan', 'tanzania', 'turks and caicos islands', 'uae',
    'united arab emirates', 'uk', 'united kingdom',
    'united states minor outlying islands', 'usa', 'united states',
    'venezuela', 'british virgin islands', 'us virgin islands',
  ];

  const result = await WordModel.updateMany(
    { category: 'country' },
    { $pullAll: { aliases: aliases } }
  );

  logger.info(`Rollback complete: ${result.modifiedCount} documents updated`);
}
