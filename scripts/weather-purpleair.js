// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: magic;
// widget code by Jason Snell <jsnell@sixcolors.com>
// based on code by Matt Silverlock
// gradient routine contributed by Rob Silverii

// ===== imports
let utilities_listwidget = importModule('utilities-listwidget.js')
let utilities_aqi = importModule('utilities-aqi.js')
let utilities_purpleair = importModule('utilities-purpleair.js')
let utilities = importModule('utilities.js')

// =============

// const CACHE_FILE = 'aqi_data.json'
// Find a nearby PurpleAir sensor ID via https://fire.airnow.gov/
// Click a sensor near your location: the  ID is the trailing integers
// https://www.purpleair.com/json has all sensors by location & ID.

let WIDGET_PARAMETER = args.widgetParameter || 'station:36991,units:c'

async function run() {   
	let wg = new ListWidget()
	wg.setPadding(20,15,10,10)
	
	try {

		// Begin parse parameters
		const parameters = utilities.parseWidgetParameter(WIDGET_PARAMETER)
		const sensor_id = parameters.station
		const units = parameters.units
		// end parse parameters

		console.log(`Using sensor ID: ${sensor_id}`)
		
		let data = await utilities_purpleair.getSensorData(sensor_id)
		console.log(data)
				
		let epaPM = utilities_aqi.epaPM25toAQI(data.pm2_average, data.hum)
        let aqi = utilities_aqi.aqiFromPM(epaPM)
		let level = utilities_aqi.calculateLevel(aqi)
		// End setup

		// Assign URL
		wg.url = utilities_purpleair.purpleAirURL(data)

		// ======= Start drawing
		utilities_listwidget.setBackgroundGradient(wg,new LinearGradient(), new Color(level.startColor), new Color(level.endColor))
		
		// Location
		utilities_listwidget.addText(wg, data.loc, new Color(level.textColor), Font.mediumSystemFont(12))

		let tempHumStack = wg.addStack()

		// Temp
		switch (units) {
			case 'c':
				utilities_listwidget.addText(tempHumStack, data.temp_c + '℃', new Color(level.textColor), Font.semiboldRoundedSystemFont(18))
				utilities_listwidget.addSpacer(tempHumStack, 10)
				break
			default:
				utilities_listwidget.addText(tempHumStack, data.temp_f + '℉', new Color(level.textColor), Font.semiboldRoundedSystemFont(18))
				utilities_listwidget.addSpacer(tempHumStack, 17)
				break
		}
		
		// Humidity
		utilities_listwidget.addText(tempHumStack, '💧' + data.hum + '%', new Color(level.textColor), Font.semiboldRoundedSystemFont(18))
		
		utilities_listwidget.addSpacer(wg, 10)
		
		// AQI Prefix
		utilities_listwidget.addText(wg, 'AQI' + data.trend, new Color(level.textColor), Font.regularSystemFont(10))
		
		// AQI Number string
		utilities_listwidget.addText(wg, aqi.toString(), new Color(level.textColor), Font.semiboldRoundedSystemFont(20), 45)
		
		// AQI Level 
		utilities_listwidget.addText(wg, level.label, new Color(level.textColor), Font.boldSystemFont(12))
		utilities_listwidget.addSpacer(wg, 20)		
		
		// Last Updated 
		let updatedAt = new Date(data.ts*1000).toLocaleTimeString('en-US', { timeZone: 'PST', hour: '2-digit', minute:'2-digit'})
		utilities_listwidget.addText(wg, `Updated ${updatedAt}`, new Color(level.textColor), Font.lightSystemFont(10))		 
		utilities_listwidget.addSpacer(wg)
		// ======= End drawing		
	} catch (e) {
		console.log(e)
		utilities_listwidget.addText(wg, `error: ${e}`, Color.red(), Font.boldSystemFont(12), 10)
	}

	wg.presentSmall()
	Script.setWidget(wg)
	Script.complete()
}

await run()
