

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

// Ribbon effect styles
const ribbonEffects = {
  blue: "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105",
  red: "bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg transform scale-105",
  green: "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg transform scale-105",
  gold: "bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg transform scale-105",
  purple: "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg transform scale-105",
}

const Button = React.forwardRef(
  (
    { className, variant, size, asChild = false, ribbonEffect = false, ribbonDuration = 1000, onClick, ...props },
    ref,
  ) => {
    const [isRibbonActive, setIsRibbonActive] = React.useState(false)
    const [showShine, setShowShine] = React.useState(false)

    const handleClick = (e) => {
      if (ribbonEffect) {
        setIsRibbonActive(true)
        setShowShine(true)

        // Reset ribbon effect after duration
        setTimeout(() => {
          setIsRibbonActive(false)
        }, ribbonDuration)

        // Reset shine effect slightly earlier
        setTimeout(() => {
          setShowShine(false)
        }, ribbonDuration - 200)
      }

      // Call original onClick if provided
      if (onClick) {
        onClick(e)
      }
    }

    const Comp = asChild ? Slot : "button"

    // Determine ribbon style
    const ribbonStyle = typeof ribbonEffect === "string" ? ribbonEffects[ribbonEffect] : ribbonEffects.blue

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          "relative overflow-hidden",
          isRibbonActive && ribbonStyle,
          showShine &&
            "before:absolute before:top-0 before:left-0 before:w-full before:h-full before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:skew-x-12 before:animate-[shine_0.8s_ease-out]",
          className,
        )}
        ref={ref}
        onClick={handleClick}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }





  // <div className="flex flex-wrap gap-4">
  //            <Button ribbonEffect="blue" >
  //             {/* <Star className="w-4 h-4" /> */}
  //             Blue Ribbon
  //           </Button>
  //           <Button ribbonEffect="red">
  //             {/* <Gift className="w-4 h-4" /> */}
  //             Red Ribbon
  //           </Button>
  //           <Button ribbonEffect="green">
  //             {/* <Download className="w-4 h-4" /> */}
  //             Green Ribbon
  //           </Button>
  //           <Button ribbonEffect="gold">
  //             {/* <Award className="w-4 h-4" /> */}
  //             Gold Ribbon
  //           </Button>
  //         </div>



// import * as React from "react"
// import { Slot } from "@radix-ui/react-slot"
// import { cva } from "class-variance-authority"
// import { cn } from "@/lib/utils"

// const buttonVariants = cva(
//   "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
//   {
//     variants: {
//       variant: {
//         default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
//         destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
//         outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
//         secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
//         ghost: "hover:bg-accent hover:text-accent-foreground",
//         link: "text-primary underline-offset-4 hover:underline",
//         // New ribbon variants
//         ribbon:
//           "relative bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:from-blue-600 hover:to-purple-700 overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-full before:bg-gradient-to-r before:from-white/20 before:to-transparent before:skew-x-12 before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700",
//         ribbonRed:
//           "relative bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg hover:from-red-600 hover:to-pink-700 overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-full before:bg-gradient-to-r before:from-white/20 before:to-transparent before:skew-x-12 before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700",
//         ribbonGreen:
//           "relative bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:from-green-600 hover:to-emerald-700 overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-full before:bg-gradient-to-r before:from-white/20 before:to-transparent before:skew-x-12 before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700",
//         ribbonGold:
//           "relative bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg hover:from-yellow-500 hover:to-orange-600 overflow-hidden before:absolute before:top-0 before:left-0 before:w-full before:h-full before:bg-gradient-to-r before:from-white/30 before:to-transparent before:skew-x-12 before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700",
//       },
//       size: {
//         default: "h-9 px-4 py-2",
//         sm: "h-8 rounded-md px-3 text-xs",
//         lg: "h-10 rounded-md px-8",
//         icon: "h-9 w-9",
//       },
//     },
//     defaultVariants: {
//       variant: "default",
//       size: "default",
//     },
//   },
// )

// const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
//   const Comp = asChild ? Slot : "button"
//   return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
// })
// Button.displayName = "Button"

// export { Button, buttonVariants }
