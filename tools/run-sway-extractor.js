import {fetchContent} from '../src/extractors/sway.js'
import {FileContent} from '../src/extractors/file-content.js'

const data = await fetchContent({}, FileContent.toJsonStringContent(`<sway id>`))
console.log(data.asString().substring(0, 100))
