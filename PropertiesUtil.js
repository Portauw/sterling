const PROPERTY_KEYS = {
  FILE_PROPERTIES_KEY: 'FILE_PROPERTIES',
  TODOIST_LAST_SYNC_TOKEN_KEY: 'TODOIST_LAST_SYNC_TOKEN'
}
const CONSTANTS = {
  CACHE_NAME: 'ITP Cache'
}
class PropertiesUtil {
  static getScriptPropertyObject(property) {
    var raw = PropertiesService.getScriptProperties().getProperty(property);
    if (raw) {
      return JSON.parse(raw);
    }
    return null;
  }

  static getFileMetaPropertyValue(fileName){
    return this.getScriptPropertyObject(fileName);
  }

  static getFilesPropertyValue() {
    return this.getScriptPropertyObject(PROPERTY_KEYS.FILE_PROPERTIES_KEY);
  }

  static saveFilesPropertyValue(value) {
    this.setPropertyValue(PROPERTY_KEYS.FILE_PROPERTIES_KEY, value);
  }

  static setPropertyValue(key, value) {
    PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(value));
  }

  /**
   * CAUTION when removing property
   */
  static removeProperty(key) {
    PropertiesService.getScriptProperties().deleteProperty(key);
  }

  static getOptionalCache(cacheName) {
    var cache = this.getScriptPropertyObject(cacheName);
    return cache ?? null;
  }

  static isFileExpired(fileName) {
    var fileMeta = this.getFileMetaPropertyValue(fileName);
    const now = new Date();
    now.setMinutes(now.getMinutes() - 10);
    if (fileMeta?.expirationTime) {
      var expireResult = new Date(fileMeta.expirationTime) < now;
      return expireResult;
    } else {
      //log(`${fileName} - No fileMeta!`)
      return false;
    }
  }

  static cleanUpProperties(){
    const items = PropertiesService.getScriptProperties().getProperties();
    for (const item in items) { 
      if (item === PROPERTY_KEYS.FILE_PROPERTIES_KEY || 
      item === PROPERTY_KEYS.TODOIST_LAST_SYNC_TOKEN_KEY){
        log(`Not a file key,`);
      } else {
        try {
          const expired = isFileExpired(item);
          if (expired){
              log(`${item} expired? ${expired}`);
             // PropertiesUtil.removeProperty(item)
          }
        }catch (err){
          log(`Error in ${item} with ${items[item]}`);
        }
      }
    }
  }
}