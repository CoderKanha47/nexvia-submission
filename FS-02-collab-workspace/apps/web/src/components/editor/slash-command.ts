import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import { SlashMenu, type SlashMenuHandle } from './SlashMenu';
import { filterSlashItems, type SlashItem } from './slash-items';

/**
 * Slash ("/") command menu. Uses the official TipTap suggestion plugin and
 * renders a React menu into a fixed-position portal (no tippy dependency).
 */
export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem>({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
        items: ({ query }) => filterSlashItems(query),
        render: () => {
          let component: ReactRenderer<SlashMenuHandle> | null = null;
          let popup: HTMLDivElement | null = null;

          const position = (clientRect: DOMRect | null | undefined): void => {
            if (!popup || !clientRect) return;
            const top = Math.min(clientRect.bottom + 6, window.innerHeight - 320);
            popup.style.top = `${Math.max(8, top)}px`;
            popup.style.left = `${Math.min(clientRect.left, window.innerWidth - 300)}px`;
          };

          const destroy = (): void => {
            component?.destroy();
            component = null;
            popup?.remove();
            popup = null;
          };

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashMenu, {
                props: { items: props.items, command: props.command },
                editor: props.editor,
              });
              if (!props.clientRect) return;
              popup = document.createElement('div');
              popup.className = 'slash-menu-portal';
              document.body.appendChild(popup);
              popup.appendChild(component.element);
              position(props.clientRect());
            },
            onUpdate: (props) => {
              component?.updateProps({ items: props.items, command: props.command });
              position(props.clientRect?.());
            },
            onKeyDown: (props) => {
              if (props.event.key === 'Escape') {
                destroy();
                return true;
              }
              return component?.ref?.onKeyDown?.(props.event) ?? false;
            },
            onExit: destroy,
          };
        },
      }),
    ];
  },
});
