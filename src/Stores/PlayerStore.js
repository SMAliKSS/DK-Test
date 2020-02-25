import EventEmitter from './EventEmitter';
import { getSearchMessagesFilter, openMedia } from '../Utils/Message';
import { PLAYER_PLAYBACKRATE_NORMAL, PLAYER_VOLUME_NORMAL } from '../Constants';
import MessageStore from './MessageStore';
import TdLibController from '../Controllers/TdLibController';
import { getRandomInt } from '../Utils/Common';

const RepeatEnum = Object.freeze({
    NONE: 'NONE',
    REPEAT: 'REPEAT',
    REPEAT_ONE: 'REPEAT_ONE'
});

export { RepeatEnum };

class PlayerStore extends EventEmitter {
    constructor() {
        super();

        const { playbackRate, volume } = this.loadPlayerSettings();

        this.playbackRate = playbackRate;
        this.volume = volume;
        this.repeat = RepeatEnum.NONE;
        this.shuffle = false;

        this.reset();

        this.addTdLibListener();
    }

    reset = () => {
        this.playlist = null;
        this.message = null;
        this.time = null;
        this.videoStream = null;
        this.instantView = null;
        this.pageBlock = null;
    };

    addTdLibListener = () => {
        TdLibController.on('update', this.onUpdate);
        TdLibController.on('clientUpdate', this.onClientUpdate);
    };

    removeTdLibListener = () => {
        TdLibController.off('update', this.onUpdate);
        TdLibController.off('clientUpdate', this.onClientUpdate);
    };

    onUpdate = async update => {
        switch (update['@type']) {
            case 'updateAuthorizationState': {
                const { authorization_state } = update;
                if (!authorization_state) break;

                if (authorization_state['@type'] === 'authorizationStateClosed') {
                    this.reset();
                }
                break;
            }
            default:
                break;
        }
    };

    close = () => {
        TdLibController.clientUpdate({
            '@type': 'clientUpdateMediaClose'
        });
    };

    loadPlayerSettings() {
        const player = localStorage.getItem('player') || {};

        let { playbackRate, volume } = player;

        playbackRate =
            playbackRate && Number(playbackRate) >= 1 && Number(playbackRate) <= 2
                ? Number(playbackRate)
                : PLAYER_PLAYBACKRATE_NORMAL;
        volume = volume && Number(volume) >= 0 && Number(volume) <= 1 ? Number(volume) : PLAYER_VOLUME_NORMAL;

        return { playbackRate, volume };
    }

    savePlayerSettings() {
        const { volume, playbackRate } = this;

        localStorage.setItem('player', JSON.stringify({ volume, playbackRate }));
    }

    onClientUpdate = update => {
        switch (update['@type']) {
            case 'clientUpdateMediaClose': {
                this.reset();

                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaActive': {
                const { chatId, messageId, instantView, pageBlock } = update;

                const message = MessageStore.get(chatId, messageId);
                if (message) {
                    this.message = message;
                    this.emit(update['@type'], update);
                    this.getPlaylist(chatId, messageId);

                    return;
                } else if (instantView && pageBlock) {
                    this.instantView = instantView;
                    this.pageBlock = pageBlock;
                    this.emit(update['@type'], update);
                }

                break;
            }
            case 'clientUpdateMediaVolume': {
                const { volume } = update;

                this.volume = volume;

                this.savePlayerSettings();

                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaRepeat': {
                const { repeat } = update;

                this.repeat = repeat;

                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaShuffle': {
                const { shuffle } = update;

                this.shuffle = shuffle;

                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaPlaybackRate': {
                const { playbackRate } = update;

                this.playbackRate = playbackRate;

                this.savePlayerSettings();

                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaPlay': {
                this.playing = true;

                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaTitleMouseOver': {
                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaPause': {
                this.playing = false;

                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaStop': {
                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaNext': {
                this.emit(update['@type'], update);

                this.moveToNextMedia(false);
                break;
            }
            case 'clientUpdateMediaPrev': {
                this.emit(update['@type'], update);

                this.moveToPrevMedia();
                break;
            }
            case 'clientUpdateMediaEnding': {
                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaEnd': {
                this.emit(update['@type'], update);

                if (update.moveNext) {
                    if (this.moveToNextMedia(true)) {
                    } else {
                        this.close();
                    }
                } else {
                    this.close();
                }
                break;
            }
            case 'clientUpdateMediaTime': {
                const { duration, currentTime, timestamp } = update;

                this.time = {
                    currentTime: currentTime,
                    duration: duration,
                    timestamp: timestamp
                };

                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaCaptureStream': {
                this.videoStream = update.stream;

                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaViewerPlay': {
                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaViewerPause': {
                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaViewerEnded': {
                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaPlaylistLoading': {
                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaPlaylistPrev': {
                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaPlaylist': {
                this.emit(update['@type'], update);
                break;
            }
            case 'clientUpdateMediaPlaylistNext': {
                this.emit(update['@type'], update);
                break;
            }
            default:
                break;
        }
    };

    moveToPrevMedia = () => {
        if (!this.playlist) return;
        if (!this.message) return;

        const { chat_id, id } = this.message;
        const { messages } = this.playlist;
        if (!messages) return;

        const index = messages.findIndex(x => x.chat_id === chat_id && x.id === id);
        if (index === -1) return;

        if (index + 1 < messages.length) {
            const message = messages[index + 1];

            openMedia(message.chat_id, message.id, false);
        }
    };

    moveToNextMedia = useRepeatShuffle => {
        if (!this.playlist) return false;
        if (!this.message) return false;

        const { chat_id, id } = this.message;
        const { messages } = this.playlist;
        if (!messages) return false;

        const index = messages.findIndex(x => x.chat_id === chat_id && x.id === id);
        if (index === -1) return false;

        let nextIndex = -1;
        if (!useRepeatShuffle) {
            nextIndex = index - 1;
        } else {
            switch (this.repeat) {
                case RepeatEnum.NONE: {
                    if (this.shuffle) {
                        nextIndex = getRandomInt(0, messages.length);
                    } else {
                        nextIndex = index - 1;
                    }
                    break;
                }
                case RepeatEnum.REPEAT_ONE: {
                    nextIndex = index;
                    break;
                }
                case RepeatEnum.REPEAT: {
                    if (this.shuffle) {
                        nextIndex = getRandomInt(0, messages.length);
                    } else {
                        nextIndex = index - 1 >= 0 ? index - 1 : messages.length - 1;
                    }
                    break;
                }
                default:
                    break;
            }
        }

        if (nextIndex >= 0) {
            const message = messages[nextIndex];

            openMedia(message.chat_id, message.id, false);
            return true;
        }

        return false;
    };

    getPlaylist = async (chatId, messageId) => {
        const { playlist: currentPlaylist } = this;

        if (currentPlaylist) {
            const { messages } = currentPlaylist;
            if (messages && messages.findIndex(x => x.chat_id === chatId && x.id === messageId) !== -1) {
                return;
            }
        }

        TdLibController.clientUpdate({
            '@type': 'clientUpdateMediaPlaylistLoading',
            chatId: chatId,
            messageId: messageId
        });

        const filter = getSearchMessagesFilter(chatId, messageId);
        if (!filter) {
            this.playlist = {
                chatId: chatId,
                messageId: messageId,
                totalCount: 1,
                messages: [MessageStore.get(chatId, messageId)]
            };

            TdLibController.clientUpdate({
                '@type': 'clientUpdateMediaPlaylist',
                playlist: this.playlist
            });

            return;
        }

        const result = await TdLibController.send({
            '@type': 'searchChatMessages',
            chat_id: chatId,
            query: '',
            sender_user_id: 0,
            from_message_id: messageId,
            offset: -50,
            limit: 100,
            filter: filter
        });

        MessageStore.setItems(result.messages);

        const { total_count, messages } = result;

        this.playlist = {
            chatId: chatId,
            messageId: messageId,
            totalCount: total_count,
            messages: messages
        };

        TdLibController.clientUpdate({
            '@type': 'clientUpdateMediaPlaylist',
            playlist: this.playlist
        });
    };
}

const store = new PlayerStore();
window.player = store;
export default store;
