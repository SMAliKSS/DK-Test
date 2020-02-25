import React from 'react';
import PropTypes from 'prop-types';
import { withIV } from '../IVContext';
import Caption from './Caption';
import { getPageBlock } from '../../../Utils/InstantView';

function Collage(props) {
    const { pageBlocks, caption, iv } = props;

    return (
        <div className='collage'>
            {pageBlocks.map((x, index) => getPageBlock(x, iv, index))}
            <Caption text={caption.text} credit={caption.credit} />
        </div>
    );
}

Collage.propTypes = {
    pageBlocks: PropTypes.array.isRequired,
    caption: PropTypes.object.isRequired
};

export default withIV(Collage);
