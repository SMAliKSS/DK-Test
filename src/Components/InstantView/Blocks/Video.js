import React from 'react';
import PropTypes from 'prop-types';
import Caption from './Caption';
import MediaVideo from '../../../Components/Message/Media/Video';
import { IV_PHOTO_DISPLAY_SIZE } from '../../../Constants';

function Video(props) {
    const { video, caption, openMedia } = props;

    return (
        <figure>
            <MediaVideo video={video} displaySize={IV_PHOTO_DISPLAY_SIZE} openMedia={openMedia} />
            <Caption text={caption.text} credit={caption.credit} />
        </figure>
    );
}

Video.propTypes = {
    video: PropTypes.object,
    caption: PropTypes.object.isRequired,
    needAutoplay: PropTypes.bool.isRequired,
    isLooped: PropTypes.bool.isRequired,
    openMedia: PropTypes.func
};

export default Video;
