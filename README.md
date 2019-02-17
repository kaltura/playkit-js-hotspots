# Playkit hotspots plugin


## Player V2 support
Although this plugin was developed to support playkit (player v7) it contains also an adapter to work with player v2. 

### Test locally
1. copy file `src/player-v2/test.template.ejs` to `src/player-v2/test.ejs`
2. optional, update the entry id, partner id and ks. You can keep the existing values to see an entry with hotspots defined.
3. run `npm run start-v2`

### Deploy plugin to production
Hotspots plugin is deployed to production as part of [mwEmbed repo](https://github.com/kaltura/mwEmbed). To deploy it do the following:
1. run `npm run build-v2`
2. copy `build/bundle.js` into `modules/hotspots/resources/hotspots.js` in [mwEmbed repo](https://github.com/kaltura/mwEmbed).
3. copy `build/bundle.js.map` into `modules/hotspots/resources/hotspots.js.map` in [mwEmbed repo](https://github.com/kaltura/mwEmbed).
4. if you changed `src/player-v2/public/hotspots.css` - copy into `modules/hotspots/resources/hotspots.css` in [mwEmbed repo](https://github.com/kaltura/mwEmbed).
4. test it with the test page `modules/hotspots/tests/hotspots.test.html` (using xamp or mamp). for example `http://localhost:8888/html5.kaltura/mwEmbed/modules/hotspots/tests/hotspots.test.html` 

	* if needed you can enable debug logs in console by using a query string `?debugKalturaPlayer` and filtering messages with `[hotspots]` in the console.
5. once satisfied commit and push changes **in this branch**.
6. tag this version and update `modules/hotspots/readme.md` in [mwEmbed repo](https://github.com/kaltura/mwEmbed).
7. commit and push changes in [mwEmbed repo](https://github.com/kaltura/mwEmbed).
8. go grab a coffee.

### Deploy side branch to QA environment

Do the following in [mwEmbed repo](https://github.com/kaltura/mwEmbed):
1. create a **side branch** from the relevant mwEmbed version branch, ie `2.73-hotspots-0.2.0`
	* You should not create a Pullrequest for this branch, as the value you are changing is handled automatically by the player. 
1. create a temp version name in `includes/DefaultSettings.php`, ie:
```
// The version of the library:
$wgMwEmbedVersion = '2.73_hotspots_0.2.0';
```
1. commit your changes in the side branch
2. create a tag using the following command (replace `X.X` with target player version and `Z.Z.Z` with hotspots plugin version)
```
git tag -a vX.X_hotspots_vZ.Z.Z -m "vX.X_hotspots_vZ.Z.Z"
git push origin vX.X_hotspots_vZ.Z.Z
```
