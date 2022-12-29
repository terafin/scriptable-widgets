/**
 * Modified by Andrew Wadycki & Justin Wood
 * This widget is based from <https://github.com/jasonsnell/PurpleAir-AQI-Scriptable-Widget>
 * By Jason Snell, Rob Silverii, Adam Lickel, Alexander Ogilvie, and Brian Donovan.
 * Based on code by Matt Silverlock.
 */

const API_URL = "https://api.purpleair.com/";

/**
 * This widget requires a PurpleAir API key. If you don't have one,
 * you'll need to request one from <https://www2.purpleair.com/pages/contact-us>
 * and enter your READ KEY in the API key variable below.
 */
// Andrew's API_KEY
const API_KEY = "C41F7446-F627-11EC-8561-42010A800005";

let utilities = importModule('utilities.js')

module.exports.purpleAirURL = function(data) {
    return 'https://www.purpleair.com/map?opt=1/i/mAQI/a10/cC0&select=' + data.sensor_id + '#14/' + data.lat + '/' + data.lon
}

/**
 * Get JSON from a local file
 *
 * @param {string} fileName
 * @returns {object}
 */
function getCachedData(fileName) {
  const fileManager = FileManager.local();
  const cacheDirectory = fileManager.joinPath(fileManager.libraryDirectory(), "terafin-aqi");
  const cacheFile = fileManager.joinPath(cacheDirectory, fileName);

  if (!fileManager.fileExists(cacheFile)) {
	  console.error('no cached data')
    return undefined;
  }

  const contents = fileManager.readString(cacheFile);
  return JSON.parse(contents);
}

/**
 * Wite JSON to a local file
 *
 * @param {string} fileName
 * @param {object} data
 */
function cacheData(fileName, data) {
  const fileManager = FileManager.local();
  const cacheDirectory = fileManager.joinPath(fileManager.libraryDirectory(), "terafin-aqi");
  const cacheFile = fileManager.joinPath(cacheDirectory, fileName);

  if (!fileManager.fileExists(cacheDirectory)) {
    fileManager.createDirectory(cacheDirectory);
  }

  const contents = JSON.stringify(data);
  fileManager.writeString(cacheFile, contents);
}

async function _getSensorData(id) {
	const sensorCache = `sensor-${id}-data.json`;
	
	var req = new Request(`${API_URL}/v1/sensors/${id}`);
	req.headers = {"X-API-Key": API_KEY} ;
	
	let json = undefined;
	if(getCachedData(sensorCache)) {
		const { json: cachedJson, updatedAt } = getCachedData(sensorCache);
		console.error('got cached data')
		json = cachedJson;
		console.error(`cachedJason: ${json}`)
		if (Date.now() - updatedAt > 15 * 60 * 1000) {
			// Refresh if our data is 15 minutes or older
			json = undefined;
		} else {
			console.log(`Using cached sensor data: ${updatedAt}`);
		}
	}
	
	if(!json){
		json = await req.loadJSON()
		const sensorData = { json, updatedAt: Date.now() }
		cacheData(sensorCache, sensorData);
		console.log(`Updated cached sensor data`);
	}
	
	//let json = await req.loadJSON()
	
    let partLive = parseInt(json.sensor.stats["pm2.5"], 10)
    let partTime = parseInt(json.sensor.stats["pm2.5_10minute"], 10)
    let partDelta = partTime - partLive
	// Tempertautre_F: Temperature inside of the sensor housing in Fahrenheit. On average, this is 8F higher than ambient conditions. (From BME280)
    let temp_f = json.sensor.temperature	- 8
    let temp_c = utilities.convertFtoC(temp_f)		
    
    if ( partDelta > 5 ) {
        theTrend = ' Improving' 
    } else if ( partDelta < -5 ) {
        theTrend = ' Worsening'
    } else {
         theTrend = ''
    }

    
    // Start Setup
    let adj1 = parseInt(json.sensor["pm2.5_cf_1_a"], 10)
    let adj2 = parseInt(json.sensor["pm2.5_cf_1_b"], 10)
	// Relative humidity inside of the sensor housing as a percentage. On average, this is 4% lower than ambient conditions (From BME280)
    let hum = parseInt(json.sensor.humidity, 10) + 4
    let dataAverage = parseInt(json.sensor["pm2.5_cf_1"], 10);

    if (adj2 >= 0.0) {
        dataAverage = ((adj1 + adj2) / 2);
    }
	return {
		'sensor_id': id,
		'val': json.sensor.stats,
		'pm2_average': dataAverage,
		'adj1': adj1,
		'adj2': adj2,
		'ts': json.sensor.last_seen,
		'temp_f': temp_f,
		'temp_c': temp_c,
		'trend': theTrend,
		'hum': hum,
		'loc': json.sensor.name,
		'lat': json.sensor.latitude,
		'lon': json.sensor.longitude
	}
}

module.exports.getSensorData = _getSensorData