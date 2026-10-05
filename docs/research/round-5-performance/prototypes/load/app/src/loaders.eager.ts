import * as controls from './ui/controls'; import * as chart from './ui/chart'; import * as town from './skins/town'; import * as country from './country/index'; import * as inspector from './ui/inspector'; import * as gpu from './gpu/webgpu';
export const loadControls = async () => controls; export const loadChart = async () => chart; export const loadTownSkin = async () => town;
export const loadCountry = async () => country; export const loadInspector = async () => inspector; export const loadWebGpu = async () => gpu;
