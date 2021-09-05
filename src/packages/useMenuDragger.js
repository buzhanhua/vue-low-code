import { events } from './events';
export function useMenuDragger(containerRef, data) {
    let currentComponent = null;
    const dragenter = (e) => {
        e.dataTransfer.dropEffect = 'move'; // h5拖动的图标
    }
    const dragover = (e) => {
        e.preventDefault();
    }
    const dragleave = (e) => {
        e.dataTransfer.dropEffect = 'none'; // h5拖动的禁用图标
    }

    const drop = (e) => {
        let blocks = data.value.blocks; // 内部已经渲染的组件
        data.value = {
            ...data.value,
            blocks: [
                ...blocks,
                {
                    top: e.offsetY,
                    left: e.offsetX,
                    zIndex: 1,
                    key: currentComponent.key,
                    alignCenter: true, //表示希望松手的时候当前节点可以居中， 不在这里做的原因是因为dom并没有生成拿不到宽高
                    props: {},
                    model: {}
                }
            ]
        }
        currentComponent = null;
    }

    const dragstart = (e, component) => {
        // 给目标区域绑定事件
        // dragenter进入元素中 添加一个移动的标识
        // dragover 在目标元素经过 必须要阻止默认行为 否则不能触发drop
        // dragleave 离开元素的时候 需要增加一个禁用标识
        // drop 松手的时候 根据拖拽的组件 添加一个组件
        containerRef.value.addEventListener('dragenter', dragenter);
        containerRef.value.addEventListener('dragover', dragover);
        containerRef.value.addEventListener('dragleave', dragleave);
        containerRef.value.addEventListener('drop', drop);

        currentComponent = component;
        events.emit('dragstart'); // 发布拖拽开始事件
    }

    const dragend = (e) => {
        containerRef.value.removeEventListener('dragenter', dragenter);
        containerRef.value.removeEventListener('dragover', dragover);
        containerRef.value.removeEventListener('dragleave', dragleave);
        containerRef.value.removeEventListener('drop', drop);
        currentComponent = null;
        events.emit('dragend'); // 发布拖拽结束事件
    }

    return {
        dragstart,
        dragend
    }
}