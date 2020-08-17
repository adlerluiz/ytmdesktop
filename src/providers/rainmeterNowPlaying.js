const { ipcMain } = require('electron')
const WebSocket = require('ws')
const url = 'ws://127.0.0.1:8974'
var ws, reconnect, volumePercent, seekPosition, _isStarted

function isStarted() {
    return _isStarted
}

function _setIsStarted(value) {
    _isStarted = value
}

function start() {
    try {
        ws = new WebSocket(url, {
            perMessageDeflate: false,
        })

        ws.on('open', function open() {
            _setIsStarted(true)
        })

        ws.on('message', function incoming(data) {
            var versionNumber = data.toLowerCase().split(':')
            if (versionNumber[0].includes('version')) {
                //Check that version number is the same major version
            }
            try {
                doAction(data)
            } catch (e) {
                ws.send('Error:' + e)
                throw e
            }
        })

        ws.on('error', function error(_) {
            console.log('Failed to connect rainmeter WebNowPlaying WS')
        })

        ws.on('close', () => {
            stop()
            reconnect = setTimeout(() => {
                if (!isStarted()) {
                    start()
                }
            }, 5000)
        })
    } catch {
        console.log('error')
    }
}

function stop() {
    _setIsStarted(false)
    ws.terminate()
}

function setActivity(data) {
    if (isStarted()) {
        ws.send(`COVER:${data.track.cover}`)
        ws.send(`TITLE:${data.track.title}`)
        ws.send(`ARTIST:${data.track.author}`)
        ws.send(`ALBUM:${data.track.album}`)
        ws.send(`STATE:${data.player.isPaused ? 2 : 1}`)
        ws.send(`DURATION:${data.track.durationHuman}`)
        ws.send(`POSITION:${data.player.seekbarCurrentPositionHuman}`)
        ws.send(`VOLUME:${data.player.volumePercent}`)
        if (data.player.likeStatus === 'LIKE') {
            ws.send(`RATING:5`)
        } else if (data.player.likeStatus === 'DISLIKE') {
            ws.send(`RATING:1`)
        } else {
            ws.send(`RATING:0`)
        }
    }
}

function doAction(data) {
    var dataSplit = data.split(' ')
    var action = dataSplit.shift()
    var actionParams = dataSplit

    if (actionParams.length && action == 'SetPosition') {
        var seekValuePercent = parseFloat(actionParams[1].split(':')[0])
        if (seekValuePercent != 0) {
            action = 'SetPositionSeekbar'
            actionParams[0] = actionParams[0].split(':')[0] / 100000
        }
    }

    switch (action) {
        case 'PlayPause':
            ipcMain.emit('media-command', {
                command: 'media-play-pause',
                value: true,
            })
            break

        case 'next':
            ipcMain.emit('media-command', {
                command: 'media-track-next',
                value: true,
            })
            break

        case 'previous':
            ipcMain.emit('media-command', {
                command: 'media-track-previous',
                value: true,
            })
            break

        case 'togglethumbsup':
            ipcMain.emit('media-command', {
                command: 'media-vote-up',
                value: true,
            })
            break

        case 'togglethumbsdown':
            ipcMain.emit('media-command', {
                command: 'media-vote-down',
                value: true,
            })
            break

        case 'SetVolume':
            if (actionParams[0] >= volumePercent) {
                ipcMain.emit('media-command', {
                    command: 'media-volume-up',
                    value: true,
                })
            } else {
                ipcMain.emit('media-command', {
                    command: 'media-volume-down',
                    value: true,
                })
            }

            break

        case 'SetPosition':
            var currentPosition = actionParams[0].split(':')[0]
            if (currentPosition >= seekPosition) {
                ipcMain.emit('media-command', {
                    command: 'media-seekbar-forward',
                    value: true,
                })
            } else {
                ipcMain.emit('media-command', {
                    command: 'media-seekbar-rewind',
                    value: true,
                })
            }
            break

        case 'SetPositionSeekbar':
            ipcMain.emit('media-command', {
                command: 'media-seekbar-set',
                value: actionParams[0],
            })
            break
    }
}

module.exports = {
    isStarted: isStarted,
    start: start,
    stop: stop,
    setActivity: setActivity,
}
