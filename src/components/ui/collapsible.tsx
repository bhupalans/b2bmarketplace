
"use client"

import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const OriginalCollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof OriginalCollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof OriginalCollapsibleContent> & { contentWrapper?: React.ElementType }
>(({ contentWrapper: Wrapper = "div", ...props }, ref) => {
  return (
    <OriginalCollapsibleContent
      ref={ref}
      asChild
      {...props}
    >
      <Wrapper>{props.children}</Wrapper>
    </OriginalCollapsibleContent>
  )
});
CollapsibleContent.displayName = 'CollapsibleContent';

const Collapsible = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root> & { contentWrapper?: React.ElementType }
>(({ contentWrapper, ...props }, ref) => {
  const children = React.Children.toArray(props.children);
  const trigger = children.find((child: any) => child.type === CollapsibleTrigger || child.props.asChild);
  const content = children.find((child: any) => child.type === CollapsibleContent);

  return (
    <CollapsiblePrimitive.Root {...props} ref={ref}>
      {trigger}
      {content && React.cloneElement(content as React.ReactElement, { contentWrapper })}
    </CollapsiblePrimitive.Root>
  )
});
Collapsible.displayName = "Collapsible"


export { Collapsible, CollapsibleTrigger, CollapsibleContent }
