import { computed, ref } from "vue";
export function useFocus(data, previewRef, cb){ // 获取元素选中信息
    const selectIndex = ref(-1); // 表示没有任何一个被选中, 确定以谁画基准线

    const lastSelectBlock = computed(() => data.value.blocks[selectIndex.value]); // 最后选中的节点
    // 收集选中和未选中的组件
    const focusData = computed(() => {
        let focus = [];
        let unfocused = [];
        data.value.blocks.forEach((block) => (block.focus ? focus : unfocused).push(block));
        return { focus, unfocused };
    });
    const clearBlockFocus = () => {
        data.value.blocks.forEach((block) => {
            block.focus = false;
        });
        selectIndex.value = -1;
    }

    const blockMousedown = (e, block, index) => {
        // 预览模式不可选中， 防止预览模式下拖动
        if(previewRef.value) return;
        e.preventDefault();
        e.stopPropagation();
        // block上规划一个属性focus, 获取焦点后就将focus变为true
        if(e.shiftKey){
            // 按住shift键时
            if(focusData.value.focus.length <= 1){
                // 当只有一个节点被选中的时候， 摁住shift键也不会切换状态
                block.focus = true;
            }else{
                block.focus = !block.focus;
            }
        }else{
            if(!block.focus){
                clearBlockFocus();
                block.focus = true;
            } //当自己已经被选中了， 再次点击时还是选中状态
        }

        selectIndex.value = index;
        cb(e);
    }


    const containerMousedown = () => {
        // 预览模式不可选中
        if(previewRef.value) return;
        // 点击容器清空选中
        clearBlockFocus();
    }

    return {
        blockMousedown,
        containerMousedown,
        focusData,
        lastSelectBlock,
        clearBlockFocus
    }
}