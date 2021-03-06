import React from 'react';
import PropTypes from 'prop-types';
import { compose, withSaveRef } from '../../Utils/HOC';
import { withIV } from './IVContext';
import { getPageBlock } from '../../Utils/InstantView';
import './Article.css';

class Article extends React.PureComponent {
    render() {
        const { forwardedRef, iv } = this.props;
        if (!iv) return null;

        const { page_blocks, is_rtl } = iv;
        if (!page_blocks) return;

        const blocks = page_blocks.map((x, index) => getPageBlock(x, iv, index));

        return (
            <article ref={forwardedRef} dir={is_rtl ? 'rtl' : 'ltr'}>
                {blocks}
            </article>
        );
    }
}

Article.propTypes = {
    chatId: PropTypes.number,
    messageId: PropTypes.number
};

const enhance = compose(withSaveRef(), withIV);

export default enhance(Article);
